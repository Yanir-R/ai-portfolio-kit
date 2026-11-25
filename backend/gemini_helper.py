"""The Gemini call: model selection, generation config, and failure mapping.

Prompt content lives in prompt.py and corpus assembly in context.py. What
remains here is the part that talks to the API and decides what to do when it
refuses.

Failure handling turns on the SDK's structured status code rather than the text
of the message. Which codes are worth falling back on is the whole question: a
chain that treats only 503 as retryable never falls back at all, because a
retired model answers 404.
"""

from dataclasses import dataclass
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, Field
from typing import Dict, Iterable, Literal, Optional, Tuple
import json
import logging
import re
import threading
import time

from context import Knowledge
from prompt import NO_KNOWLEDGE_MESSAGE, build_contents, build_system_instruction

logger = logging.getLogger(__name__)

# Fallback models in order of preference. Only pinned stable model codes, no
# "-latest" aliases: Google documents that a "-latest" alias is hot-swapped on
# every new release and recommends that production apps use a specific stable
# model (https://ai.google.dev/gemini-api/docs/models). A model change is
# therefore a reviewed code change, and the cheaper stable models further down
# the chain cover quota exhaustion or a retirement of the first entry.
MODELS = (
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
)

# Status codes that mean "this model is not usable for us right now", so the next
# candidate is worth trying: retired/unknown model, exhausted quota, or a
# transient server-side failure.
RETRYABLE_STATUS_CODES = frozenset({404, 429, 500, 502, 503, 504})

# How long one upstream call may take before it is abandoned. The SDK counts in
# milliseconds.
#
# A ceiling on pathology, not a latency target: it only has to be low enough that
# a wedged connection cannot hold a worker indefinitely. Real answers on this
# deployment land around 16 seconds, so the generous margin is deliberate.
# Cutting off a slow-but-working reply is the worse failure - a hung call wastes
# a worker, but a truncated good answer tells a visitor the site is broken when
# it was about to work.
REQUEST_TIMEOUT_MS = 45_000

# The visitor's ceiling, across the whole fallback chain.
#
# A per-call timeout alone is not enough: three models timing out in sequence is
# three times the wait, and nobody watching a chat bubble waits that long. Once
# this much time has gone, remaining models are skipped and the busy reply is
# returned - the answer is not coming, and saying so is better than continuing
# to spend the visitor's patience on it.
#
# The frontend sets no timeout of its own, so this is the only bound a visitor
# actually experiences. It sits well under Cloud Run's 300s request ceiling.
TOTAL_DEADLINE_SECONDS = 70

# How long a model is left alone after it refuses.
#
# Without it, every request re-attempts every exhausted model and pays the
# round-trip to be told "no" again, so a spent daily quota becomes queued
# requests and a starved service instead of a fast, honest "I'm getting more
# questions than I can keep up with".
#
# Deliberately short, and deliberately not parsed from the quota metadata. A
# 429 may mean the per-minute burst or the per-day allowance, and distinguishing
# them means reading a quotaId string out of an error body that Google is free
# to reword. A minute of cooldown is right for the transient case and, for an
# exhausted day, costs one wasted call a minute instead of one per request.
MODEL_COOLDOWN_SECONDS = 60

# model id -> monotonic time before which it should not be tried again.
_model_cooldowns: Dict[str, float] = {}
_cooldown_lock = threading.Lock()


def _model_is_cooling(model_id: str, now: float) -> bool:
    with _cooldown_lock:
        until = _model_cooldowns.get(model_id)
        if until is None:
            return False
        if now >= until:
            del _model_cooldowns[model_id]
            return False
        return True


def _start_cooldown(model_id: str, now: float) -> None:
    with _cooldown_lock:
        _model_cooldowns[model_id] = now + MODEL_COOLDOWN_SECONDS

# A hard stop on cost per request. It is NOT a length control, and sizing it as
# one truncates answers: on Gemini 3.x this budget is shared with the model's
# internal thinking tokens, which are spent first. At a 400-token budget the
# model spends ~382 of them thinking and has 14 left, so the visitor gets half a
# sentence returned as a complete-looking success with finish_reason=MAX_TOKENS.
#
# Answer length is the prompt's job ("two to four sentences", more when the
# visitor asks for detail). This number only needs headroom for the longest
# answer a visitor can legitimately ask for - a detailed answer in Hebrew,
# inside the structured reply, after thinking - so that it is never the reason
# an answer is replaced by TRUNCATED_RESPONSE_MESSAGE. Raising it costs nothing
# by itself: output is billed per token actually written, and a reply cut at
# the ceiling is billed in full and then thrown away. Observed usage at the
# LOW thinking level is ~75-110 answer tokens.
MAX_OUTPUT_TOKENS = 4_000

# How hard the model thinks before it answers.
#
# Left unset, Gemini 3.x thinks at its default level, and on this workload that
# is where most of the wait goes: ~600 thinking tokens to write ~110 tokens of
# answer, about 16 seconds end to end. The answers here are two to four
# sentences restating a corpus the model was handed, which is not a reasoning
# problem, so a low level should cut the wait without making them worse.
#
# Not every model accepts every level. A model that refuses the setting answers
# 400, which would otherwise read as a misconfiguration and end the chain, so
# that one model is asked again without it (see get_gemini_response).
THINKING_LEVEL = types.ThinkingLevel.LOW

# Gemini's content filters, set explicitly rather than left to the model's
# default, which for recent models is to block nothing. Every answer here is
# published on Yanir's behalf, so a reply that a filter would flag is one he
# would not have written; blocking at medium likelihood costs a real visitor
# nothing. A blocked reply arrives with no text and is answered with
# EMPTY_RESPONSE_MESSAGE.
SAFETY_SETTINGS = [
    types.SafetySetting(category=category, threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE)
    for category in (
        types.HarmCategory.HARM_CATEGORY_HARASSMENT,
        types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    )
]

# Why a conversation has reached the point where talking to Yanir directly
# would serve the visitor better than another answer. "none" is the usual case.
HandoffReason = Literal["business_context", "pricing", "timeline", "how_to_start", "none"]

# Longest part of a summary, and of the fit line, the site passes on. The model
# is asked for less; this is the ceiling for one that ignores it, so the card
# never fills with a wall of text.
HANDOFF_PART_MAX_CHARS = 110
HANDOFF_FIT_MAX_CHARS = 160

# A fit line is Yanir promising something in his own voice, so it may not
# carry a figure: no price, no duration, no count the profile did not make
# for this visitor. One that does is dropped and the card uses its fixed
# line for the reason instead.
_FIGURE_RE = re.compile(r"[0-9$€£₪%]")


def _clip(text: str, limit: int) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


class Handoff(BaseModel):
    """The model's read of whether this is the moment to offer a direct talk.

    Asked in the same call as the answer, so it costs a few output tokens and
    no extra request. The model only judges and restates; whether a card is
    shown is the server's decision (see main.py), so a model that says "ready"
    on every turn cannot make the site pushy.

    The summary follows the shape of a sales recap: where the visitor stands,
    the problem in their words, and what they want instead. Asked as three
    parts rather than one sentence so a missing pain is visible, and the card
    is not offered over a summary that has none.
    """

    ready: bool = Field(
        description=(
            "true only when the visitor has described a need of their own that "
            "Yanir could help with in person: their business or organisation "
            "and a concrete problem, a question about price or cost, about "
            "timing or availability, or about how to start working together. "
            "false for questions about Yanir's projects, writing or background, "
            "for small talk, for declined or out-of-scope questions, and "
            "whenever unsure."
        )
    )
    reason: HandoffReason = Field(
        description=(
            "Why ready is true: business_context (they described their "
            "business and a problem), pricing, timeline, or how_to_start. "
            "none when ready is false."
        )
    )
    situation: str = Field(
        description=(
            "When ready: who the visitor is, as they said it, one short "
            "sentence in their language and first person (e.g. 'I run a salon "
            "with two branches.'). Empty if they did not say."
        )
    )
    pain: str = Field(
        description=(
            "When ready: the problem in the visitor's own words, one short "
            "sentence, first person (e.g. 'We get a lot of WhatsApp messages "
            "about appointments.'). Empty when ready is false."
        )
    )
    goal: str = Field(
        description=(
            "When ready: what the visitor wants instead, one short sentence, "
            "first person (e.g. 'I want an agent that books against our "
            "calendar.'). Empty if they did not say."
        )
    )
    fit: str = Field(
        description=(
            "When ready: one sentence in Yanir's voice (first person, in the "
            "visitor's language) naming the kind of thing he builds that fits "
            "this pain, taken only from the PROFILE. No prices, durations or "
            "numbers, no promises of results. Empty when the PROFILE does not "
            "show such work, or when ready is false."
        )
    )

    @property
    def summary(self) -> str:
        """The recap as the visitor would send it: situation, pain, goal."""
        return " ".join(part for part in (self.situation, self.pain, self.goal) if part)


class ModelReply(BaseModel):
    """The shape the model answers in, enforced by Gemini's structured output.

    Text alone could not say whether the model answered or declined, so the
    site guessed it from the search outcome: a question that matched nothing
    was treated as declined even when the profile answered it, and a matched
    question the model could not answer was not. Asking the model for the flag
    beside the text, in the same call, costs nothing extra and makes "offer to
    take it by email" follow what actually happened.

    The descriptions are part of the request: the model reads them as the
    definition of each field.
    """

    answer: str = Field(
        description=(
            "The reply to the visitor, in plain text, following every rule above."
        )
    )
    declined: bool = Field(
        description=(
            "true when the PROFILE does not cover the question and the answer "
            "says so, or when the request is out of scope and the answer "
            "redirects it; false when the answer answers the question."
        )
    )
    handoff: Handoff = Field(
        description=(
            "Whether the conversation has reached the moment to offer a direct "
            "talk with Yanir. It never changes the answer: answer the question "
            "fully either way, and do not mention this field."
        )
    )


# Off switch for structured output, in one place. With it off the model answers
# in plain text and `declined` is reported as unknown.
STRUCTURED_OUTPUT = True

# The answer field of a reply that came back as JSON but would not parse, for
# instance cut short. Read rather than shown raw: a visitor must never see a
# brace.
_ANSWER_FIELD_RE = re.compile(r'"answer"\s*:\s*"((?:[^"\\]|\\.)*)"', re.DOTALL)


def _parse_handoff(value: object) -> Optional[Handoff]:
    """The handoff part of a reply, or None when it is missing or malformed.

    A broken handoff never costs the answer: the visitor still gets the reply,
    just without the card.
    """
    if not isinstance(value, dict):
        return None
    try:
        handoff = Handoff.model_validate(value)
    except ValueError:
        return None
    fit = _clip(handoff.fit, HANDOFF_FIT_MAX_CHARS)
    return handoff.model_copy(
        update={
            "situation": _clip(handoff.situation, HANDOFF_PART_MAX_CHARS),
            "pain": _clip(handoff.pain, HANDOFF_PART_MAX_CHARS),
            "goal": _clip(handoff.goal, HANDOFF_PART_MAX_CHARS),
            "fit": "" if _FIGURE_RE.search(fit) else fit,
        }
    )


def _parse_reply(text: str) -> Tuple[str, Optional[bool], Optional[Handoff]]:
    """The answer text, the declined flag and the handoff from the reply.

    Deterministic in every case: valid JSON gives every field it carries, and
    a missing or malformed handoff only drops the handoff; text that is not
    JSON at all (structured output switched off, or a model that ignored it) is
    the answer itself with the rest unknown; JSON that does not parse gives
    whatever answer field can be read out of it, or nothing.
    """
    stripped = text.strip()
    if not stripped.startswith("{"):
        return stripped, None, None
    try:
        reply = json.loads(stripped)
    except ValueError:
        reply = None
    if isinstance(reply, dict) and isinstance(reply.get("answer"), str):
        declined = reply.get("declined")
        return (
            reply["answer"].strip(),
            declined if isinstance(declined, bool) else None,
            _parse_handoff(reply.get("handoff")),
        )
    match = _ANSWER_FIELD_RE.search(stripped)
    if not match:
        return "", None, None
    try:
        return json.loads(f'"{match.group(1)}"').strip(), None, None
    except ValueError:
        return "", None, None


# One client per API key for the life of the process.
#
# Building a client per request also builds a new HTTP connection pool per
# request, so every question paid a fresh TLS handshake to Google before the
# model saw it. The SDK client is safe to share between the threadpool workers
# that call it.
_clients: Dict[str, "genai.Client"] = {}
_clients_lock = threading.Lock()


def _client_for(api_key: str) -> "genai.Client":
    with _clients_lock:
        client = _clients.get(api_key)
        if client is None:
            # The per-call timeout is what keeps a hung upstream call from
            # holding a worker. Cloud Run runs at most four instances, each a
            # single uvicorn process, so a handful of stalled calls occupy the
            # whole service and endpoints that never touch Gemini -
            # /api/chat/status among them - start timing out behind them. Chat
            # being unavailable is a degradation; taking the rest of the site
            # with it is an outage.
            client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS),
            )
            _clients[api_key] = client
        return client

# User-facing copy per failure category, so an auth or configuration problem is
# not reported to visitors as if the service were merely busy.
#
# These render as ordinary chat bubbles, so they are written in the agent's
# voice like every other answer. Naming the plumbing ("the AI service is over its
# quota") breaks that voice and tells a visitor nothing they can act on - the
# thing they can act on is whether to wait or to leave an email.
BUSY_MESSAGE = (
    "I'm getting more questions than I can keep up with at the moment. "
    "Give it a minute and ask me again - or leave your email here and "
    "Yanir will come back to you directly."
)
MISCONFIGURED_MESSAGE = (
    "Something on my end isn't working right now, so I can't answer properly. "
    "Leave your email here and Yanir will get back to you directly."
)
GENERIC_ERROR_MESSAGE = (
    "That didn't go through on my end. Mind trying again?"
)
# Shown instead of a half-finished answer. `finish_reason=MAX_TOKENS` is the only
# signal that one happened: the call succeeds and `response.text` reads like a
# normal reply right up to the point it stops.
TRUNCATED_RESPONSE_MESSAGE = (
    "That answer ran past its length limit and got cut off mid-thought, so I'd "
    "rather not leave you with half of it. Ask me again in a narrower way and "
    "I'll keep it tighter."
)

EMPTY_RESPONSE_MESSAGE = (
    "I didn't manage to put an answer together for that one. "
    "Could you try rephrasing it?"
)


@dataclass(frozen=True)
class Answer:
    """The reply, and what producing it actually cost.

    Everything past `text` is optional because not every reply comes from a
    model. A refusal to answer without a corpus, or a busy message returned
    while every model is still cooling down, never reaches the API at all -
    those arrive with `model` unset and no counts behind them.

    That distinction is the point. The site's argument is that it does not
    overstate, so a reply the model never produced must not be able to display
    numbers describing how it was produced. Nothing here is derived, rounded up
    or filled in: a figure the API did not report stays `None` rather than
    becoming a plausible zero.
    """

    text: str
    model: Optional[str] = None
    prompt_tokens: Optional[int] = None
    thinking_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    finish_reason: Optional[str] = None
    latency_ms: Optional[int] = None
    # How much of the prompt Gemini served from its implicit cache.
    cached_tokens: Optional[int] = None
    # The model's own word on whether it answered (see ModelReply). None when
    # it was not asked or the reply did not say.
    declined: Optional[bool] = None
    # The model's read of whether to offer a direct talk (see Handoff). None
    # when it was not asked or the reply did not carry one.
    handoff: Optional[Handoff] = None
    # True when a model was called but the text is the site's own copy
    # (an empty or truncated reply), so it is not replayed as something the
    # model said.
    fallback: bool = False

    @property
    def from_model(self) -> bool:
        """Whether an upstream call produced this reply."""
        return self.model is not None

    @property
    def written_by_model(self) -> bool:
        """Whether the text itself is the model's words."""
        return self.from_model and not self.fallback


def get_gemini_response(
    api_key: str,
    user_question: str,
    knowledge: Knowledge,
    conversation_history: Optional[Iterable[Dict[str, str]]] = None,
    reading: str = "",
) -> Answer:
    """Answers a visitor's question as Yanir's agent, grounded in `knowledge`.

    Returns an `Answer` in every case, including failure: `.text` is always
    user-facing copy, so callers render it as the assistant's reply rather than
    distinguishing error paths. The metadata is what separates them - a failure
    carries no model and no counts.
    """
    if knowledge.is_empty:
        # Nothing to ground an answer in. Calling the model here would produce
        # confident invention about a real person, which is worse than an outage.
        logger.error("Refusing to answer: knowledge corpus is empty")
        return Answer(text=NO_KNOWLEDGE_MESSAGE)

    client = _client_for(api_key)
    system_instruction = build_system_instruction(knowledge, reading)
    shared = dict(
        system_instruction=system_instruction,
        max_output_tokens=MAX_OUTPUT_TOKENS,
        safety_settings=SAFETY_SETTINGS,
    )
    if STRUCTURED_OUTPUT:
        shared.update(response_mime_type="application/json", response_schema=ModelReply)
    config = types.GenerateContentConfig(
        **shared,
        thinking_config=types.ThinkingConfig(thinking_level=THINKING_LEVEL),
    )
    # The same request at the model's default thinking level, for a model that
    # refuses the setting above.
    plain_config = types.GenerateContentConfig(**shared)
    contents = build_contents(user_question, conversation_history)

    last_error: Optional[Exception] = None
    skipped_all = True
    started = time.monotonic()
    for model_id in MODELS:
        now = time.monotonic()

        # Out of time for the visitor. Trying another model can only make the
        # wait longer for an answer that is already late.
        if now - started >= TOTAL_DEADLINE_SECONDS:
            logger.warning(
                "Giving up after %.1fs without an answer; %s and any models after it not tried",
                now - started,
                model_id,
            )
            break

        # A model that just refused is skipped without a call. Asking again
        # inside the cooldown buys nothing and costs the round-trip, which is
        # how an exhausted quota queues requests up behind it.
        if _model_is_cooling(model_id, now):
            logger.info("Skipping %s: still cooling down after a recent refusal", model_id)
            continue

        skipped_all = False
        call_started = time.monotonic()
        try:
            try:
                response = client.models.generate_content(
                    model=model_id,
                    contents=contents,
                    config=config,
                )
            except genai_errors.APIError as e:
                if e.code != 400:
                    raise
                # Possibly this model does not take the thinking level. Asking
                # once more without it costs one round-trip; reporting the site
                # as misconfigured over an optional setting costs the answer.
                # A 400 for any other reason fails again here and is handled
                # as before.
                logger.warning(
                    "Model %s answered 400 with thinking_level=%s; retrying without it",
                    model_id,
                    THINKING_LEVEL.name,
                )
                response = client.models.generate_content(
                    model=model_id,
                    contents=contents,
                    config=plain_config,
                )
            # Measured around the call itself rather than the whole function, so
            # it reports what the model took and not how long a cooling-down
            # model was skipped for.
            latency_ms = int((time.monotonic() - call_started) * 1000)
            usage = _read_usage(model_id, response)

            text, declined, handoff = _parse_reply(response.text or "")
            if not text:
                return Answer(
                    text=EMPTY_RESPONSE_MESSAGE,
                    model=model_id,
                    latency_ms=latency_ms,
                    fallback=True,
                    **usage,
                )

            # A MAX_TOKENS finish means the visitor is looking at half a
            # sentence. The call succeeded and `response.text` is a plausible
            # string, which is exactly why this has to be checked rather than
            # trusted: handing over a truncated answer on Yanir's behalf presents
            # an incomplete claim as a complete one.
            #
            # The prompt asks for two to four sentences, so hitting a 1,500
            # token ceiling means something already went wrong - usually
            # thinking tokens consuming the shared budget. Saying so is more use
            # than a fragment.
            if usage["finish_reason"] == "MAX_TOKENS":
                return Answer(
                    text=TRUNCATED_RESPONSE_MESSAGE,
                    model=model_id,
                    latency_ms=latency_ms,
                    fallback=True,
                    **usage,
                )

            return Answer(
                text=text,
                model=model_id,
                latency_ms=latency_ms,
                declined=declined,
                handoff=handoff,
                **usage,
            )

        except Exception as e:
            last_error = e
            logger.exception("Gemini API error with model %s", model_id)

            # Decide from the SDK's structured status code rather than substring
            # matching, so an unrelated message containing "404" cannot be
            # mistaken for a retired model.
            status_code = e.code if isinstance(e, genai_errors.APIError) else None

            if status_code in RETRYABLE_STATUS_CODES:
                # Rate limiting and exhausted quota are the cases worth
                # remembering. A 404 means the model is retired, which no
                # cooldown fixes, and a 5xx is usually a one-off.
                if status_code == 429:
                    _start_cooldown(model_id, time.monotonic())
                logger.warning(
                    "Model %s unavailable (HTTP %s), trying next model", model_id, status_code
                )
                continue

            # Anything else (auth, malformed request, network) is not a
            # model-availability problem, so trying another model won't help.
            #
            # No usage travels with this: the call raised, so there are no
            # counts to report and inventing any would describe work that never
            # happened.
            return Answer(text=_failure_message(e))

    if skipped_all:
        # Every model was still cooling down, so nothing was even attempted.
        # That is the busy case by definition, and saying so immediately is the
        # point of the cooldown - the visitor gets an honest answer in
        # milliseconds instead of waiting out three refusals.
        logger.warning("All models cooling down; answering busy without calling upstream")
        return Answer(text=BUSY_MESSAGE)

    # Every candidate model failed; report the category of the last failure.
    return Answer(text=_failure_message(last_error))


def _read_usage(model_id: str, response) -> Dict[str, Optional[object]]:
    """Reads what the request cost, logs it, and hands it back to the caller.

    These numbers were computed and dropped for a year: logged to Cloud Run
    where nobody reads them, then discarded at the return boundary because the
    function answered with a bare string. Returning them is the whole of what
    the trace rail needed - no new measurement, only stopping the old one from
    being thrown away.

    Every field is read straight off the SDK response, so a count the API did
    not report comes back `None`. That matters more here than the tidiness of a
    zero: the numbers are shown to visitors as evidence, and a fabricated one
    would be the exact overstatement this site exists to argue against.

    The truncation warning stays because truncation is otherwise invisible: the
    call succeeds, `response.text` is a plausible string, and only
    `finish_reason` says the visitor got half a sentence.
    """
    usage = getattr(response, "usage_metadata", None)
    fields: Dict[str, Optional[object]] = {
        "prompt_tokens": getattr(usage, "prompt_token_count", None),
        "thinking_tokens": getattr(usage, "thoughts_token_count", None),
        "output_tokens": getattr(usage, "candidates_token_count", None),
        "total_tokens": getattr(usage, "total_token_count", None),
        "cached_tokens": getattr(usage, "cached_content_token_count", None),
    }

    if usage is not None:
        # `cached` is how much of the prompt Gemini served from its implicit
        # cache. The rules and the profile open every request, so a run of
        # questions should show it climbing; if it stays empty, the start of
        # the system instruction is varying and the free discount is being
        # missed. Also reported in the answer's trace.
        logger.info(
            "Gemini usage model=%s prompt=%s cached=%s thinking=%s output=%s total=%s",
            model_id,
            fields["prompt_tokens"],
            fields["cached_tokens"],
            fields["thinking_tokens"],
            fields["output_tokens"],
            fields["total_tokens"],
        )

    candidates = getattr(response, "candidates", None) or []
    finish_reason = getattr(candidates[0], "finish_reason", None) if candidates else None
    # The enum's name, not the enum: this crosses a JSON boundary on its way to
    # the browser, and `str(enum)` renders as "FinishReason.STOP" rather than
    # something a rail can print.
    name = getattr(finish_reason, "name", "") if finish_reason is not None else ""
    fields["finish_reason"] = name or None

    if name == "MAX_TOKENS":
        logger.warning(
            "Model %s hit MAX_TOKENS - the answer was truncated mid-sentence. "
            "Thinking tokens share MAX_OUTPUT_TOKENS (%d); raise it.",
            model_id,
            MAX_OUTPUT_TOKENS,
        )

    return fields


def _failure_message(error: Optional[Exception]) -> str:
    """Maps a failure to user-facing copy without leaking the raw error text."""
    if isinstance(error, genai_errors.APIError):
        if error.code in (429, 503):
            return BUSY_MESSAGE
        if error.code in (400, 401, 403, 404):
            return MISCONFIGURED_MESSAGE
    return GENERIC_ERROR_MESSAGE
