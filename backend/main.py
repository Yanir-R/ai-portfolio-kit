from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from hmac import compare_digest
from dotenv import load_dotenv
from gemini_helper import Answer, get_gemini_response
from context import get_knowledge
from language import detect_language
from selection import Selection, select
from docs_helper import (
    read_markdown_file, PROFILE_DIR, HEBREW_DIR,
    get_project_by_slug, get_projects_in, PROJECT_LANGUAGES,
    get_all_writing, get_writing_by_slug, get_writing_index, writing_overview
)
from rate_limit import (
    auto_reply_limiter, booking_address_limiter, chat_limiter, contact_limiter,
    enforce_rate_limit,
)
import guard
from prompt import RULES
import booking
import site_mail
from pydantic import BaseModel, EmailStr, Field
from typing import Dict, List, Literal, Optional
import json
import os
import datetime
from email.mime.multipart import MIMEMultipart
import smtplib
import logging
import re
from email_validator import EmailNotValidError, validate_email

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Unexpected exceptions are logged server-side with a stack trace and reported to
# clients as this opaque string, so internal paths and configuration details are
# never reflected back in an error response.
INTERNAL_ERROR_DETAIL = "Internal server error"

# Replies for the contact flow, in one place so the three paths that can accept
# an address cannot drift into three different voices. The site answers in
# Yanir's first person and its whole argument is that it does not overstate. A
# confirmation is the one message a visitor is guaranteed to read, so it is the
# worst place to sound like a different product.
EMAIL_RECEIVED_MESSAGE = (
    "Got it - that's in my inbox and I'll reply from there. "
    "Anything else you want to ask while you're here?"
)

EMAIL_INVALID_MESSAGE = (
    "That address doesn't look right. Check it and send it again, "
    "or write to rotyanir@gmail.com directly."
)

EMAIL_REQUEST_MESSAGE = (
    "Sure. Leave your email address here with a line about what you'd like to "
    "discuss, and I'll get back to you directly."
)

# Sending is best-effort from the visitor's side: if SMTP is down, telling them
# the message vanished is worse than giving them the address to use instead.
EMAIL_SEND_FAILED_MESSAGE = (
    "I couldn't get that through to my inbox just now - something on my side. "
    "Write to rotyanir@gmail.com directly and it will reach me."
)

# Detecting an intent to make contact, in two parts.
#
# Matching a bare "contact"/"email"/"newsletter" anywhere in the message would
# intercept it before it ever reached the model, so "how does your backend send
# email?" would be answered with a request for the visitor's address instead of
# an answer about the backend. On a site whose argument is that it answers from
# its sources, silently refusing a legitimate question is the most expensive
# failure available. Hence phrases that express the intent itself.
#
# A message can still contain a contact phrase and be a question about the work:
# "how does your email integration work?" holds "your email" but asks about a
# system. _TOPIC_QUESTION vetoes those. The discriminator is grammatical rather
# than a list of technical nouns, which would need extending forever: a question
# *about* something is third person or addressed to Yanir's practice ("how
# does...", "how do you...", "what did you learn..."), while a contact request is
# first person and addressed at him ("how do I reach you", "can I contact you").
# Note "how do you" is excluded and "how do I" is not - that single word is the
# difference.
_TOPIC_QUESTION = re.compile(
    r"\bhow (?:does|did|is|are|was|do you|would you|should you)\b"
    r"|\bwhat (?:did|do) you (?:learn|use|build|do|run|choose)\b"
    r"|\bwhy (?:does|did|is|are|do you)\b",
    re.IGNORECASE,
)

# An address on its own, versus one embedded in a sentence. Both are deliberately
# loose: `validate_email` is the authority on whether an address is real, and
# these only decide which part of the message to hand it.
_EMAIL_ONLY_RE = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
_EMAIL_IN_TEXT_RE = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

CONTACT_INTENT_PHRASES = (
    "your email",
    "email you",
    "contact you",
    "get in touch",
    "in touch",
    "reach out",
    "reach you",
    "hire you",
    "work with you",
    "work together",
    "email address",
)

# Seconds one SMTP connection may take. Without a ceiling a stalled mail server
# would hold a worker thread for as long as the socket stayed open.
SMTP_TIMEOUT_SECONDS = 10

load_dotenv()

def validate_email_config():
    required_vars = ["EMAIL_ADDRESS", "EMAIL_PASSWORD", "YOUR_EMAIL"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        return False
    return True

if not validate_email_config():
    logger.warning("Email configuration is incomplete. Email functionality will not work!")

FRONTEND_PROD_URL = os.getenv("FRONTEND_PROD_URL", "")
FRONTEND_DEV_URL = os.getenv("FRONTEND_DEV_URL", "http://localhost:3000")
FRONTEND_VITE_URL = os.getenv("FRONTEND_VITE_URL", "http://127.0.0.1:3000")

# Local dev hosts are always permitted. Deployed origins are assembled from the
# FRONTEND_* vars above plus a comma-separated ALLOWED_ORIGINS, so pointing the
# API at a new frontend host (Cloudflare Pages, a custom domain) is a config
# change rather than a code change. No wildcard: allow_credentials is enabled.
_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def _build_allowed_origins() -> List[str]:
    configured = [FRONTEND_PROD_URL, FRONTEND_DEV_URL, FRONTEND_VITE_URL]
    configured += os.getenv("ALLOWED_ORIGINS", "").split(",")

    origins: List[str] = []
    seen = set()
    for origin in _DEV_ORIGINS + configured:
        origin = origin.strip().rstrip("/")
        if origin and origin not in seen:
            seen.add(origin)
            origins.append(origin)
    return origins


allowed_origins = _build_allowed_origins()
logger.info("CORS allowed origins: %s", allowed_origins)

# Request-size ceilings. Rate limiting caps how *often* a client can call these
# endpoints, not how *large* a single call may be: without these, one request
# could carry an arbitrarily long message and an unbounded history array, all of
# which is read, iterated and partly forwarded upstream. Declaring the limits on
# the schema means FastAPI answers 422 before any of that happens.
MAX_MESSAGE_CHARS = 2_000
MAX_HISTORY_MESSAGES = 40

# How many already-shown pieces a request may name. More than the corpus holds
# is never needed.
MAX_SHOWN_SLUGS = 40
MAX_HISTORY_CONTENT_CHARS = 4_000

# Frontend message types that represent something the visitor actually said.
# Anything not listed here is UI chrome - 'system' and 'initial' are the greeting
# and error banners, and replaying them as conversation turns would teach the
# model that its own greeting was part of the dialogue. 'quick' is a canned
# question the visitor clicked, so it counts as a user turn.
_USER_MESSAGE_TYPES = frozenset({"user", "quick"})
_MODEL_MESSAGE_TYPES = frozenset({"ai"})


class ChatMessage(BaseModel):
    type: str
    content: str = Field(max_length=MAX_HISTORY_CONTENT_CHARS)
    is_email_collection: Optional[bool] = False
    email_collected: Optional[bool] = False
    # The signature the server sent with an assistant reply. A replayed
    # assistant turn without a valid one is not shown to the model; see guard.py.
    sig: Optional[str] = Field(default=None, max_length=64)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    conversation_history: Optional[List[ChatMessage]] = Field(
        default=None, max_length=MAX_HISTORY_MESSAGES
    )
    collected_email: Optional[EmailStr] = None
    # Asked from a piece's own page: that piece is sent first, whatever the
    # question's words match. A slug that does not exist is simply ignored.
    context: Optional["ChatContext"] = None
    # Pieces already shown as cards in this conversation, so a follow-up does
    # not show them again. Slugs only, checked against the corpus.
    shown: List[str] = Field(default_factory=list, max_length=MAX_SHOWN_SLUGS)


class ChatContext(BaseModel):
    type: Literal["writing"]
    ref: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9-]+$")


ChatRequest.model_rebuild()

class ContactRequest(BaseModel):
    # EmailStr rather than str, matching the chat paths, and a length ceiling on
    # the message. Both are declared here rather than checked in the handler so
    # a malformed request is answered 422 before it reaches one - which also
    # means it never spends a rate-limit slot, since FastAPI validates the body
    # before the endpoint runs.
    email: EmailStr
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    # What the page was about when the form opened, and the site's language:
    # the topic heads Yanir's notification, the language picks the reply.
    topic: Optional[str] = Field(default=None, max_length=120)
    lang: Literal["he", "en"] = "he"


class BookingRequest(BaseModel):
    # The time comes from cal.com's own list of free slots, read by the page;
    # cal.com checks it again when booking, so here it only has to be a time.
    start: datetime.datetime
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    notes: Optional[str] = Field(default=None, max_length=1000)
    lang: Literal["he", "en"] = "he"


def _to_model_turns(history: Optional[List[ChatMessage]]) -> List[Dict[str, str]]:
    """Maps the frontend's message list to Gemini roles, dropping UI chrome.

    An assistant turn is kept only when it carries the signature this server
    sent with it, so a request cannot put words in the assistant's mouth.
    Fixed copy the page writes itself is unsigned and is dropped too, which
    costs nothing: it was never part of what the model said.
    """
    turns: List[Dict[str, str]] = []
    for message in history or []:
        if message.type in _USER_MESSAGE_TYPES:
            role = "user"
        elif message.type in _MODEL_MESSAGE_TYPES:
            if not guard.turn_is_signed(message.content, message.sig):
                continue
            role = "model"
        else:
            continue
        turns.append({"role": role, "content": guard.clean_input(message.content)})
    return turns


class ContextCount(BaseModel):
    """How many documents of one kind went into the request."""

    kind: str
    count: int


class Source(BaseModel):
    """One document that was placed in front of the model."""

    kind: Literal["profile", "project", "writing"]
    slug: str
    title: str


class AnswerTrace(BaseModel):
    """What one model answer cost and what it was given.

    Deliberately only what the system can back. The counts come from the SDK's
    own usage metadata and the document figures from the selection, so every
    number here is measured rather than derived.

    What is *not* here is as considered as what is. There is no confidence
    score, because nothing verifies an answer against the corpus - and a site
    whose argument is that its AI can be caught out would be making exactly the
    claim it warns about. Nor is there a claim about which document an answer
    came *out of*: selection decides what the model was given, and no step
    afterwards records which of those it leaned on. The distinction is the
    difference between a receipt and a guess.

    `context_outcome` travels with the counts because "these documents were
    chosen for your question", "these were only the closest found" and "nothing
    matched, so only his notes went" are different facts. Rendering them as a
    bare number would collapse them into a claim of selectivity the last two
    cannot support.

    `Knowledge.approx_tokens` is deliberately absent. It is a chars-over-four
    estimate of the same quantity `prompt_tokens` reports exactly, and showing a
    guess beside the measurement of the same thing only invites a reader to work
    out which one to believe. It stays a server-side signal for deciding when
    the corpus needs trimming.
    """

    model: Optional[str] = None
    prompt_tokens: Optional[int] = None
    thinking_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    finish_reason: Optional[str] = None
    latency_ms: Optional[int] = None
    # Pluralisation of `kind` is left to the frontend, which is where the
    # site's copy lives.
    context: List[ContextCount]
    context_outcome: Literal[
        "narrowed", "closest", "unmatched", "conversational", "no_corpus", "unfocused"
    ]
    context_available: int
    # The same documents `context` counts, by name. They are what the model was
    # given for this question, in the order it was given them - not the ones
    # the answer drew on, which nothing here can know.
    sources: List[Source]
    # The language the question was read as, which decides whether the Hebrew
    # or the English version of each document was sent.
    language: Literal["en", "he"]


class Block(BaseModel):
    """Something the site draws beside the answer text.

    Chosen by the server from the selection, never by the model: a slug here is
    one that exists, because it came out of the corpus rather than out of
    generated text. Shapes agreed with the site's design:

    - `writing`: one piece, `ref` is its slug.
    - `writing_list`: several pieces, `items` are slugs best first (at most
      five), `total` is how many matched, `ref` says what the list is
      ("all", "recent", "topic", or a topic id when it continues one).
    - `writing_series`: a series as one card, `ref` is its id, `items` the
      parts that matched. Shown instead of several cards from the same series.
    - `writing_topics`: the subjects written about, `items` are topic ids
      with most pieces first. Beside the whole list, or when nothing matched.

    A card's quote, note, media and Hebrew summary come from the writing index,
    which the site reads from /api/writing, so they are never generated text.
    """

    type: Literal["writing", "writing_list", "writing_series", "writing_topics"]
    ref: str
    items: Optional[List[str]] = None
    total: Optional[int] = None


# At most this many blocks beside one answer, so the answer stays the main thing.
MAX_BLOCKS = 2


def _series_with(slugs: List[str]) -> Optional[str]:
    """The series most of `slugs` belong to, when at least two do."""
    counts: Dict[str, int] = {}
    for series in get_writing_index()["series"]:
        members = {part["slug"] for part in series.get("parts", [])}
        counts[series["id"]] = sum(1 for slug in slugs if slug in members)
    best = max(counts, key=lambda sid: counts[sid], default=None)
    return best if best and counts[best] >= 2 else None


def _series_of_slug(slug: str) -> Optional[str]:
    for series in get_writing_index()["series"]:
        if any(part["slug"] == slug for part in series.get("parts", [])):
            return series["id"]
    return None


def _topic_ids() -> List[str]:
    """Topic ids with at least one piece, most pieces first."""
    return [topic["id"] for topic in writing_overview(get_all_writing())["topics"]]


def _writing_blocks(selection: Selection, reading: Optional[str] = None) -> List[Block]:
    """The cards a writing answer carries, from what selection found.

    `reading` is the piece the visitor asked from. It is already open in front
    of them, so it is never offered back as a card.
    """
    intent = selection.writing_intent
    slugs = [slug for slug in selection.writing if slug != reading]
    if reading and not slugs:
        return []
    if not slugs:
        if selection.writing_unmatched:
            return [Block(type="writing_topics", ref="all", items=_topic_ids())]
        return []

    if intent in ("related", "context"):
        # Evidence for an answer that was not about the writing. Two parts of
        # one series are one card rather than two; the build log of a project
        # is one thing to a visitor, not nine.
        series = _series_with(slugs) if intent == "related" else None
        if series:
            return [Block(type="writing_series", ref=series, items=slugs)]
        return [Block(type="writing", ref=slug) for slug in slugs[:MAX_BLOCKS]]

    if len(slugs) == 1:
        return [Block(type="writing", ref=slugs[0])]

    series = _series_with(slugs) if intent in ("topic", "more") else None
    if series and all(_series_of_slug(slug) == series for slug in slugs):
        return [
            Block(type="writing_series", ref=series, items=slugs)
        ]

    blocks = [
        Block(
            type="writing_list",
            ref=selection.writing_ref or intent,
            items=slugs,
            total=selection.writing_total,
        )
    ]
    if intent == "all":
        blocks.append(Block(type="writing_topics", ref="all", items=_topic_ids()))
    return blocks[:MAX_BLOCKS]


# "What are your latest posts?" needs no model: the answer is the index, sorted
# by date. Answering it from the index saves a call from the daily quota and
# cannot get a date wrong.
RECENT_REPLY = {
    "en": "My latest pieces, newest first.",
    "he": "הקטעים האחרונים שלי, מהחדש לישן.",
}


class ChatResponse(BaseModel):
    """One shape for every chat reply.

    `response` stays the first field so the text can be streamed ahead of the
    rest if streaming is added.

    The two flags drive the frontend's collection state, so a reply that omits
    one leaves the client guessing at it.

    `trace` is present only when a model produced the answer. The contact flow
    replies without calling Gemini at all, and a rail under those would be
    describing a request that never happened.
    """

    response: str
    email_collected: bool = False
    is_email_collection: bool = False
    trace: Optional[AnswerTrace] = None
    # Cards drawn beside the answer. Empty when the reply has nothing to show.
    blocks: List[Block] = []
    # "model" when Gemini wrote the text, "index" when it was answered from the
    # writing index without a model call, absent for the contact flow.
    answered_by: Optional[Literal["model", "index"]] = None
    # The language the question was read as, so the cards can match the answer.
    language: Optional[Literal["en", "he"]] = None
    # Sent back with this reply when it is replayed as history, proving the
    # server wrote it. See guard.py.
    sig: Optional[str] = None


def _log_chat_audit(
    language: str,
    selection: Selection,
    blocks: List[Block],
    answered_by: Optional[str],
    context: Optional[str] = None,
    shown: int = 0,
) -> None:
    """One structured line per answer.

    What was asked for (by kind, never the visitor's words), what was sent and
    what was shown. Enough to ask later which posts get read and which
    questions found nothing.
    """
    logger.info(
        "chat_audit %s",
        json.dumps(
            {
                "language": language,
                "outcome": selection.outcome,
                "writing_intent": selection.writing_intent or None,
                "writing_unmatched": selection.writing_unmatched or None,
                "context": context,
                "shown": shown or None,
                "sent": [f"{d['kind']}/{d['slug']}" for d in selection.knowledge.documents],
                "listed": len(selection.knowledge.listed),
                "blocks": [b.model_dump(exclude_none=True) for b in blocks],
                "answered_by": answered_by,
            },
            ensure_ascii=False,
        ),
    )


def _chat_reply(
    response: str,
    email_collected: bool = False,
    is_email_collection: bool = False,
    trace: Optional[AnswerTrace] = None,
    blocks: Optional[List[Block]] = None,
    answered_by: Optional[str] = None,
    language: Optional[str] = None,
) -> ChatResponse:
    return ChatResponse(
        response=response,
        email_collected=email_collected,
        is_email_collection=is_email_collection,
        trace=trace,
        blocks=blocks or [],
        answered_by=answered_by,
        language=language,
        sig=guard.sign_turn(response),
    )


# Shown instead of an answer that recites the rules. One sentence, back to
# the work, which is what the rules ask the model to say in that case anyway.
RULES_DECLINE = {
    "en": "That's not something I share here. Ask me about my work, my projects or what I write about.",
    "he": "את זה אני לא משתף כאן. אפשר לשאול אותי על העבודה שלי, הפרויקטים או מה שאני כותב.",
}

_rules_echo = guard.RulesEcho(RULES)


def _checked_answer_text(text: str, language: str) -> str:
    """The model's answer after the output checks in guard.py."""
    if _rules_echo.matches(text):
        logger.warning("Answer quoted the rules; replaced with a decline")
        return RULES_DECLINE.get(language, RULES_DECLINE["en"])
    return guard.clean_output(text)


def _answer_trace(
    answer: Answer, selection: Selection, language: str
) -> Optional[AnswerTrace]:
    """The trace for `answer`, or None when no model produced it."""
    if not answer.from_model:
        return None

    return AnswerTrace(
        model=answer.model,
        prompt_tokens=answer.prompt_tokens,
        thinking_tokens=answer.thinking_tokens,
        output_tokens=answer.output_tokens,
        total_tokens=answer.total_tokens,
        finish_reason=answer.finish_reason,
        latency_ms=answer.latency_ms,
        context=[
            ContextCount(kind=kind, count=count)
            for kind, count in selection.knowledge.source_counts
        ],
        context_outcome=selection.outcome,
        context_available=selection.available,
        sources=[Source(**document) for document in selection.knowledge.documents],
        language=language,
    )


async def _deliver_collected_email(
    email: str, message_content: str, context: str
) -> ChatResponse:
    """Emails an address collected in chat and returns the reply to show for it.

    Both places that accept an address route through here so a delivery failure
    reads the same either way.
    """
    try:
        await _send_contact_email(email, message_content)
    except HTTPException:
        # A delivery failure is ours, not the visitor's. Reporting it as a 500
        # would leave them staring at a generic error with no idea their message
        # went nowhere.
        logger.exception("Contact delivery failed for %s", context)
        return _chat_reply(EMAIL_SEND_FAILED_MESSAGE)

    # The address is delivered by email, which is the record. There is no reason
    # for it to sit in log storage as well.
    logger.info("Email notification sent for %s", context)
    return _chat_reply(EMAIL_RECEIVED_MESSAGE, email_collected=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# The interactive docs and the OpenAPI schema describe every route to anyone who
# asks. Nothing on the site uses them, so they are not served.
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

# Shared secret proving a request arrived through Cloudflare rather than by
# calling the run.app URL directly.
#
# CORS does not do this job: it is enforced by browsers, on browsers, so curl, a
# script, or anything that omits an Origin header is unaffected. The allowlist
# above stops another website's JavaScript using this API, but does nothing about
# the case that actually costs something - somebody pointing a loop at
# /chat-with-files and burning the Gemini quota, or saturating the global limiter
# so real visitors get 429s.
#
# The edge injects this header on every request it forwards. The value has to be
# unguessable, because any client can send an arbitrary header: the header is not
# a secret channel, the VALUE is the secret. Cloudflare's own docs make the same
# point about forwarded client-certificate headers.
#
# Unset means unenforced, deliberately. That lets the header be introduced at the
# edge and the frontend be repointed before enforcement begins, so no ordering of
# those deploys can strand the site talking to an API that has started rejecting
# it. Setting the variable is the last step, not the first.
ORIGIN_SHARED_SECRET = os.getenv("ORIGIN_SHARED_SECRET", "").strip()

# The one path that stays reachable without the header, for Cloud Run's own
# health probing and any uptime check. It costs no quota and answers a bare
# status, nothing about the service behind it.
_UNGUARDED_PATHS = frozenset({"/health"})


@app.middleware("http")
async def require_edge_secret(request: Request, call_next):
    # Whether this request is *proven* to have arrived through our Cloudflare
    # Worker. Only a valid secret establishes that, so it starts false and is
    # never assumed - when the secret is unset the API is reachable directly and
    # nothing about the forwarding chain can be trusted.
    #
    # rate_limit.client_key reads this to decide whether CF-Connecting-IP is
    # believable. That header is trivially forgeable by anyone talking to the
    # origin, and worthless on its own; it is only meaningful once the request
    # has proved it came through the edge that set it.
    request.state.edge_verified = False

    if ORIGIN_SHARED_SECRET and request.url.path not in _UNGUARDED_PATHS:
        # Preflights never carry custom headers - the browser sends them to ask
        # whether the real request may. Rejecting them here would break CORS
        # for the legitimate frontend; the request that follows is still
        # checked.
        if request.method != "OPTIONS":
            presented = request.headers.get("x-edge-auth", "")
            # compare_digest rather than == so the comparison does not return
            # early on the first differing byte. Compared as bytes because
            # compare_digest raises on a non-ASCII str, which any caller can
            # send.
            if not compare_digest(
                presented.encode("utf-8"), ORIGIN_SHARED_SECRET.encode("utf-8")
            ):
                logger.warning(
                    "Rejected request to %s without a valid edge secret", request.url.path
                )
                return JSONResponse(status_code=403, content={"detail": "Forbidden"})
            request.state.edge_verified = True
    return await call_next(request)


# Read-only content that changes only when a new image is deployed. Without a
# Cache-Control header every page view refetched the same JSON from Cloud Run,
# and with min-instances=0 a first visit after a quiet spell paid a cold start
# for data the browser already had. Five minutes fresh, then served from the
# browser's copy while it refreshes in the background, so a new post appears at
# most a few minutes after its deploy.
_CACHEABLE_PREFIXES = ("/api/writing", "/api/projects", "/api/content/")
READ_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600"


@app.middleware("http")
async def cache_read_only_content(request: Request, call_next):
    response = await call_next(request)
    if (
        request.method == "GET"
        and response.status_code == 200
        and request.url.path.startswith(_CACHEABLE_PREFIXES)
        and "cache-control" not in response.headers
    ):
        response.headers["Cache-Control"] = READ_CACHE_CONTROL
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # The site sends no cookies and no auth headers of its own, so there is
    # nothing for a browser to attach credentials to. Saying so keeps a future
    # cookie from becoming readable cross-origin by accident.
    allow_credentials=False,
    # Every route is GET or POST; a preflight lists only what the site uses.
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    # Response headers are not readable by cross-origin JavaScript unless they
    # are exposed. Without this the frontend can see the 429 status but not the
    # Retry-After value the limiter computed, so it cannot tell the visitor how
    # long to wait.
    expose_headers=["Retry-After"],
)

@app.get("/")
@app.get("/health")
async def health_check():
    # A bare status: a probe needs nothing more, and an anonymous caller should
    # learn nothing about what runs here.
    return {"status": "ok"}

@app.get("/api/chat/status")
async def chat_status():
    """Whether the chat has anything to ground its answers in.

    One boolean, because that is all the frontend needs to decide whether to show
    its "no content available" banner. Reporting filesystem paths, the working
    directory or the document filenames would hand an anonymous caller a map of
    the container for no gain.
    """
    knowledge = get_knowledge()
    return {"knowledge_ready": not knowledge.is_empty}

@app.post("/chat-with-files", response_model=ChatResponse)
async def chat_with_files(chat_request: ChatRequest, request: Request):
    # Shape only. The visitor's message is their words, not ours to retain in
    # log storage.
    logger.info(
        "Chat request: %d chars, %d history messages",
        len(chat_request.message),
        len(chat_request.conversation_history or []),
    )
    try:
        # A message that is nothing but an address: the visitor is leaving it,
        # whatever the conversation was doing before.
        # Characters a person cannot see are removed before anything reads the
        # message, so a hidden instruction never reaches the model.
        chat_request.message = guard.clean_input(chat_request.message)
        message = chat_request.message.strip()
        if not message:
            raise HTTPException(status_code=422, detail="message is empty")
        if _EMAIL_ONLY_RE.match(message):
            try:
                email = _validated_address(message)
            except EmailNotValidError:
                return _chat_reply(EMAIL_INVALID_MESSAGE, is_email_collection=True)

            # Sending mail is a contact action, so it spends the contact
            # budget, not a chat answer.
            enforce_rate_limit(request, contact_limiter, "chat-with-files")
            return await _deliver_collected_email(
                email,
                "Address submitted in chat with no accompanying message",
                "direct email submission",
            )

        # An address inside a sentence only counts while the previous turns were
        # asking for one, so a message that merely mentions an address is not
        # mistaken for the visitor leaving theirs.
        in_email_collection = any(
            msg.is_email_collection and not msg.email_collected
            for msg in (chat_request.conversation_history or [])[-2:]
        )

        if in_email_collection:
            email_match = _EMAIL_IN_TEXT_RE.search(chat_request.message)
            if email_match:
                try:
                    email = _validated_address(email_match.group(0))
                except EmailNotValidError:
                    return _chat_reply(EMAIL_INVALID_MESSAGE, is_email_collection=True)

                # Whatever they wrote around the address is the message itself.
                # The address is removed as typed: validation lower-cases the
                # domain, so the normalised form may not occur in the message.
                message_content = chat_request.message.replace(
                    email_match.group(0), ''
                ).strip()
                if not message_content:
                    message_content = "Email provided during chat interaction"

                enforce_rate_limit(request, contact_limiter, "chat-with-files")
                return await _deliver_collected_email(
                    email, message_content, "chat-collected address"
                )

        # Asking for an address, rather than receiving one. Matching on intent
        # phrases rather than the bare words "contact"/"email"/"newsletter" is
        # what keeps a question *about* the work from being answered with a
        # request for the visitor's address - see CONTACT_INTENT_PHRASES.
        lowered = chat_request.message.lower()
        should_collect_email = (
            not any(msg.email_collected for msg in chat_request.conversation_history or []) and
            any(phrase in lowered for phrase in CONTACT_INTENT_PHRASES) and
            not _TOPIC_QUESTION.search(chat_request.message)
        )

        if should_collect_email:
            return _chat_reply(EMAIL_REQUEST_MESSAGE, is_email_collection=True)

        # Normal chat flow - answer from the cached corpus (profile, projects,
        # writing).
        #
        # Which documents this question needs, rather than all of them. The
        # selection is held in a local so the trace describes the request that
        # was actually made - calling select() again for the trace could
        # describe a different one if the corpus rebuilt in between.
        turns = _to_model_turns(chat_request.conversation_history)

        # Read from the visitor's own words only. The model's earlier replies
        # follow the visitor's language, so they add nothing, and a caller who
        # forged one must not be able to choose the corpus with it.
        language = detect_language(
            chat_request.message,
            earlier=[turn["content"] for turn in turns if turn["role"] == "user"],
        )
        selection = select(
            chat_request.message,
            get_knowledge(language),
            history=[turn["content"] for turn in turns],
            pinned=chat_request.context.ref if chat_request.context else None,
            shown=chat_request.shown,
        )

        if selection.writing_intent == "recent" and not chat_request.context:
            blocks = _writing_blocks(selection)
            _log_chat_audit(language, selection, blocks, answered_by="index")
            return _chat_reply(
                RECENT_REPLY[language], blocks=blocks, answered_by="index", language=language
            )

        # The chat budget is spent here and not at the top of the handler: every
        # reply above this line, including the "what did you write lately" list,
        # is produced without calling the model, and a budget sized to the
        # model's daily quota should only count model calls.
        enforce_rate_limit(request, chat_limiter, "chat-with-files")

        if not GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY is not set; chat cannot answer")
            raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

        # Asked from a piece's page: the model is told which piece "it" and
        # "this" mean. The title comes from the corpus, never from the request.
        question_for_model = chat_request.message
        if chat_request.context:
            reading_entry = get_writing_by_slug(chat_request.context.ref)
            if reading_entry and reading_entry.get("title"):
                question_for_model = (
                    f'(Asked while reading your post "{reading_entry["title"]}" on the site.)\n'
                    f"{chat_request.message}"
                )

        # The SDK call is synchronous and can take over a minute. Run in the
        # threadpool so it does not block the event loop, which would stall
        # every other request, health checks included, until it returned.
        answer = await run_in_threadpool(
            get_gemini_response,
            GEMINI_API_KEY,
            question_for_model,
            selection.knowledge,
            turns,
        )

        reading = chat_request.context.ref if chat_request.context else None
        blocks = _writing_blocks(selection, reading) if answer.from_model else []
        _log_chat_audit(
            language, selection, blocks,
            answered_by="model" if answer.from_model else None,
            context=chat_request.context.ref if chat_request.context else None,
            shown=len(chat_request.shown),
        )

        return _chat_reply(
            _checked_answer_text(answer.text, language) if answer.from_model else answer.text,
            trace=_answer_trace(answer, selection, language),
            blocks=blocks,
            answered_by="model" if answer.from_model else None,
            language=language,
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in chat_with_files")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

@app.get("/api/content/{file_name}")
async def get_content(file_name: str, lang: str = "en"):
    try:
        # Resolve and confine to PROFILE_DIR. The router already refuses to match
        # "/" inside a path param, but os.path.join() would silently honour an
        # absolute path, so containment is asserted here rather than assumed.
        profile_root = os.path.realpath(PROFILE_DIR)
        file_path = os.path.realpath(os.path.join(profile_root, file_name))

        if os.path.commonpath([profile_root, file_path]) != profile_root:
            raise HTTPException(status_code=404, detail="File not found")

        if not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # The Hebrew twin of a profile document, where one exists. It is looked
        # up by the already-validated name, so it cannot leave docs/he/profile.
        if lang == "he":
            twin = os.path.join(HEBREW_DIR, "profile", os.path.basename(file_path))
            if os.path.isfile(twin):
                file_path = twin

        content = read_markdown_file(file_path)
        return {"content": content}
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_content failed for %r", file_name)
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

def _validated_address(candidate: str) -> str:
    """Returns the normalised address, or raises EmailNotValidError.

    Syntax only. The deliverability check is a DNS lookup, which is a blocking
    network call on the request path for a result the SMTP send reports anyway.
    """
    return validate_email(candidate, check_deliverability=False).email


def _smtp_send(
    msg: MIMEMultipart,
    sender_email: str,
    sender_password: str,
    follow_up: Optional[MIMEMultipart] = None,
) -> None:
    """Sends a prepared message, then an optional second one, over one SMTP login.

    Blocking; call from a worker thread. Only the first message decides the
    outcome: the follow-up is the visitor's courtesy reply, and failing to send
    it must not report their message to Yanir as lost.
    """
    logger.info("Attempting to connect to SMTP server...")
    with smtplib.SMTP_SSL(
        'smtp.gmail.com', 465, timeout=SMTP_TIMEOUT_SECONDS
    ) as server:
        logger.info("Connected to SMTP server, attempting login...")
        server.login(sender_email, sender_password)
        logger.info("Logged in successfully, sending email...")
        server.send_message(msg)
        logger.info("Contact notification email sent")
        if follow_up is not None:
            try:
                server.send_message(follow_up)
                logger.info("Visitor auto-reply sent")
            except Exception:
                logger.exception("Visitor auto-reply failed")


async def _send_contact_email(
    email: str,
    message: str,
    *,
    topic: Optional[str] = None,
    route: str = "chat",
    lang: Optional[str] = None,
    reply_to_visitor: bool = False,
) -> None:
    """Delivers a collected address to Yanir's inbox.

    Raises HTTPException on a configuration or SMTP failure; callers decide how
    that reads to the visitor. The chat flow answers with a message offering the
    address directly, while the HTTP route surfaces the status.
    """
    try:
        # Email configuration
        sender_email = os.getenv("EMAIL_ADDRESS")
        sender_password = os.getenv("EMAIL_PASSWORD")
        receiver_email = os.getenv("YOUR_EMAIL")

        logger.info("Preparing contact notification email")

        if not all([sender_email, sender_password, receiver_email]):
            logger.error("Missing email configuration")
            raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

        # Yanir's notification in the site's look; replying to it answers the
        # visitor. The mail form also sends the visitor a fixed short reply.
        msg = site_mail.notification(
            sender_email,
            receiver_email,
            visitor=email,
            message=message,
            topic=topic,
            route=route,
            lang=lang,
            replied=reply_to_visitor,
        )
        follow_up = (
            site_mail.auto_reply(sender_email, receiver_email, email, lang or "he")
            if reply_to_visitor
            else None
        )

        try:
            # smtplib is synchronous; see the note on the Gemini call.
            await run_in_threadpool(
                _smtp_send, msg, sender_email, sender_password, follow_up
            )
        except Exception:
            # The raw SMTP error names the sender account and the server, so it
            # stays server-side: returning it would reflect both back to anyone
            # who can make a send fail.
            logger.exception("SMTP send failed")
            raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Contact delivery error")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)


@app.post("/api/contact")
async def contact(request: ContactRequest, http_request: Request):
    """Sends a contact message. Rate limited per client and globally."""
    enforce_rate_limit(http_request, contact_limiter, "contact")
    # The short reply goes to the address the visitor typed, so it is limited
    # by that address (see rate_limit.auto_reply_limiter). Past the limit the
    # message still reaches Yanir; only the courtesy reply is skipped.
    reply_allowed, _ = auto_reply_limiter.check(str(request.email).lower())
    if not reply_allowed:
        logger.warning("Auto-reply skipped: recipient or daily limit reached")
    await _send_contact_email(
        request.email,
        request.message,
        topic=request.topic,
        route="form",
        lang=request.lang,
        reply_to_visitor=reply_allowed,
    )
    return {"status": "success", "message": "Email sent successfully"}


# Booking a slot further ahead than this is refused before cal.com is asked:
# the page never offers one, so such a request did not come from it.
BOOKING_HORIZON_DAYS = 120

# cal.com puts the attendee's name and notes into the confirmation it emails to
# the attendee's address. With someone else's address typed in, a link in
# either would arrive in a stranger's inbox inside a real calendar invite from
# Yanir. A person booking a call has no need for one there.
_LINK_IN_NAME = re.compile(r"https?://|www\.|[/@<>]", re.IGNORECASE)
_LINK_IN_NOTES = re.compile(r"https?://|www\.", re.IGNORECASE)


@app.post("/api/booking")
async def book_call(request: BookingRequest, http_request: Request):
    """Books the discovery call. Rate limited like the contact route."""
    enforce_rate_limit(http_request, contact_limiter, "booking")
    start = request.start
    if start.tzinfo is None:
        raise HTTPException(status_code=422, detail="start needs a time zone")
    now = datetime.datetime.now(datetime.timezone.utc)
    if not now < start < now + datetime.timedelta(days=BOOKING_HORIZON_DAYS):
        raise HTTPException(status_code=422, detail="start is out of range")
    if _LINK_IN_NAME.search(request.name) or _LINK_IN_NOTES.search(request.notes or ""):
        raise HTTPException(status_code=422, detail="links are not accepted here")
    allowed, retry_after = booking_address_limiter.check(str(request.email).lower())
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many bookings for this address",
            headers={"Retry-After": str(retry_after)},
        )
    try:
        result = await run_in_threadpool(
            booking.book,
            start.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
            request.name.strip(),
            str(request.email),
            (request.notes or "").strip() or None,
            request.lang,
        )
    except booking.BookingError as err:
        if err.taken:
            raise HTTPException(status_code=409, detail="slot taken")
        raise HTTPException(status_code=502, detail=INTERNAL_ERROR_DETAIL)
    return {"status": "success", "booking": result}


@app.get("/api/writing")
async def list_writing():
    """Published pieces, newest first.

    Read-only and unauthenticated, like the project endpoints: everything it
    returns is already public on the site it links back to.
    """
    try:
        entries = get_all_writing()
        return {"writing": entries, "overview": writing_overview(entries)}
    except Exception:
        logger.exception("Error listing writing")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)


@app.get("/api/writing/{slug}")
async def get_writing(slug: str):
    try:
        entry = get_writing_by_slug(slug)
        if entry is None:
            raise HTTPException(status_code=404, detail="Not found")
        return {"entry": entry}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching writing %s", slug)
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)


def _project_language(lang: str) -> str:
    """An unknown language reads as English rather than failing the request."""
    return lang if lang in PROJECT_LANGUAGES else "en"


@app.get("/api/projects")
async def get_projects(featured_only: bool = False, lang: str = "en"):
    """Get all projects or only featured projects, in Hebrew where a twin exists"""
    try:
        projects = get_projects_in(_project_language(lang), featured_only)

        # Remove full content from listing to reduce payload size
        for project in projects:
            if 'content' in project:
                del project['content']

        return {"projects": projects}
    except Exception:
        logger.exception("Error fetching projects")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

@app.get("/api/projects/{slug}")
async def get_project(slug: str, lang: str = "en"):
    """Get a specific project by slug, in Hebrew where a twin exists"""
    try:
        project = get_project_by_slug(slug, _project_language(lang))
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        return {"project": project}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching project %r", slug)
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

