"""How one chat reply is put together, around the model's answer.

The route in routes/chat.py decides what happens to a message; this module
holds the pieces it assembles a reply from, each a plain function of the
request, the selection and the model's answer:

- the conversation as the model sees it (`to_model_turns`)
- the cards beside an answer (`writing_blocks`) and the offer to talk
  directly (`handoff_card`)
- what the answer drew on (`used_sources`) and what it cost (`answer_trace`)
- the checks on the model's text before it is shown (`checked_answer_text`)
- the one log line per answer (`log_chat_audit`) and the reply itself
  (`chat_reply`)

Nothing here reads the HTTP request or calls the model, so every piece can be
tested on its own.
"""

import json
import logging
import re
from typing import Dict, List, Optional, Set, Tuple

import guard
from context import Section
from docs_helper import get_all_writing, get_writing_index, writing_overview
from gemini_helper import Answer
from prompt import HISTORY_TURNS, RULES
from schemas import (
    MODEL_MESSAGE_TYPES,
    USER_MESSAGE_TYPES,
    AnswerTrace,
    Block,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ContextCount,
    HandoffCard,
    Source,
)
from selection import Selection

logger = logging.getLogger(__name__)

def to_model_turns(history: Optional[List[ChatMessage]]) -> List[Dict[str, str]]:
    """Maps the frontend's message list to Gemini roles, dropping UI chrome.

    An assistant turn is kept only when it carries the signature this server
    sent with it, so a request cannot put words in the assistant's mouth.
    Fixed copy the page writes itself is unsigned and is dropped too, which
    costs nothing: it was never part of what the model said.
    """
    turns: List[Dict[str, str]] = []
    for message in history or []:
        if message.type in USER_MESSAGE_TYPES:
            role = "user"
        elif message.type in MODEL_MESSAGE_TYPES:
            if not guard.turn_is_signed(message.content, message.sig):
                continue
            role = "model"
        else:
            continue
        turns.append({"role": role, "content": guard.clean_input(message.content)})
    return turns


def history_counts(
    history: Optional[List[ChatMessage]], turns: List[Dict[str, str]]
) -> Dict[str, int]:
    """How the history arrived and what of it reached the model, for the audit.

    `dropped` counts assistant turns without a valid signature, which is how a
    forged history shows up; `replayed` is what the model actually saw after
    the window in prompt.py.
    """
    received = history or []
    assistant = sum(1 for m in received if m.type in MODEL_MESSAGE_TYPES)
    kept = sum(1 for t in turns if t["role"] == "model")
    return {
        "received": len(received),
        "dropped": assistant - kept,
        "replayed": min(len(turns), HISTORY_TURNS),
    }


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


def cited_sections(selection: Selection, used: Optional[Tuple[str, ...]]) -> List[Section]:
    """The sent projects and pieces of writing the model says its answer drew on.

    Matched by title against what was actually sent, so a title the model
    invents or misremembers matches nothing. In the model's own order, so the
    first is the one the answer leans on most (the site picks its drawing by
    it); a title named twice counts once.
    """
    def norm(title: str) -> str:
        return " ".join(title.casefold().split())

    sent = {
        norm(section.title): section
        for section in selection.knowledge.sections
        if section.source in ("writing", "project") and section.slug
    }
    cited: List[Section] = []
    for title in used or ():
        section = sent.get(norm(title))
        if section is not None and section not in cited:
            cited.append(section)
    return cited


def _used_slugs(selection: Selection, used: Optional[Tuple[str, ...]]) -> Set[str]:
    """Slugs of the sent pieces of writing the model says its answer drew on."""
    return {s.slug for s in cited_sections(selection, used) if s.source == "writing"}


def used_sources(selection: Selection, answer: Answer) -> Optional[List[Source]]:
    """What the answer drew on, for the site's "sources" line and drawings.

    None when the model's own word is missing (failure copy, or a reply
    without the structured fields), so the site can fall back to what was
    sent. An empty list is a real answer: it rested on Yanir's notes alone.
    """
    if not answer.written_by_model or answer.declined is None:
        return None
    if answer.declined:
        return []
    return [
        Source(kind=s.source, slug=s.slug, title=s.title)
        for s in cited_sections(selection, answer.used)
    ]


def writing_blocks(
    selection: Selection,
    reading: Optional[str] = None,
    answer: Optional[Answer] = None,
) -> List[Block]:
    """The cards a writing answer carries, from what selection found.

    `reading` is the piece the visitor asked from. It is already open in front
    of them, so it is never offered back as a card.

    `answer` decides the cards beside an answer that was not about the writing.
    Search alone chose them before, and a word in common is not relevance: a
    question about price drew a post about reviewing pull requests because
    both say "cost". Now a piece is shown only when search sent it AND the
    model says the answer drew on it, and never beside a declined answer. No
    card is better than a wrong one.
    """
    intent = selection.writing_intent
    slugs = [slug for slug in selection.writing if slug != reading]
    if intent == "related":
        cited = (
            _used_slugs(selection, answer.used)
            if answer is not None and not answer.declined
            else set()
        )
        slugs = [slug for slug in slugs if slug in cited]
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
    "en": "Yanir's latest pieces, newest first.",
    "he": "הקטעים האחרונים של יניר, מהחדש לישן.",
}


# A direct talk is offered no earlier than the visitor's third message: by then
# there is enough of a conversation to summarise, and a first question about a
# price is answered before it is turned into a meeting.
HANDOFF_MIN_VISITOR_TURNS = 3


def handoff_card(
    answer: Answer, chat_request: ChatRequest, last_answer: bool = False
) -> Optional[HandoffCard]:
    """The card to offer with this answer, if this is the moment for it.

    The model only judges the conversation (gemini_helper.Handoff). These rules
    decide, so the card cannot appear on a failure, a decline, a first
    question, or twice in one conversation.

    `last_answer` is the visitor's last answer of the day. The next question
    would be refused, so the way to keep going is offered now, while the
    conversation is still open, rather than after the door has closed.
    """
    if not answer.written_by_model or answer.declined or chat_request.handoff_offered:
        return None
    handoff = answer.handoff
    # A recap without the visitor's problem in it is not a reason to talk.
    judged_ready = (
        handoff is not None
        and handoff.ready
        and handoff.reason != "none"
        and bool(handoff.pain)
    )
    summary = guard.clean_output(handoff.summary) if judged_ready else ""
    fit = guard.clean_output(handoff.fit) if judged_ready else ""
    if last_answer:
        return HandoffCard(
            reason=handoff.reason if judged_ready else "last_answer", summary=summary, fit=fit
        )
    if not judged_ready:
        return None
    visitor_turns = 1 + sum(
        1
        for message in chat_request.conversation_history or []
        if message.type in USER_MESSAGE_TYPES
    )
    if visitor_turns < HANDOFF_MIN_VISITOR_TURNS:
        return None
    return HandoffCard(reason=handoff.reason, summary=summary, fit=fit)


def log_chat_audit(
    language: str,
    selection: Selection,
    blocks: List[Block],
    answered_by: Optional[str],
    context: Optional[str] = None,
    shown: int = 0,
    history: Optional[Dict[str, int]] = None,
    answer: Optional[Answer] = None,
    handoff: Optional[HandoffCard] = None,
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
                "history": history,
                "declined": answer.declined if answer else None,
                "cached_tokens": answer.cached_tokens if answer else None,
                # The reason only, never the summary: it is the visitor's words.
                "handoff": handoff.reason if handoff else None,
            },
            ensure_ascii=False,
        ),
    )


def chat_reply(
    response: str,
    email_collected: bool = False,
    is_email_collection: bool = False,
    trace: Optional[AnswerTrace] = None,
    blocks: Optional[List[Block]] = None,
    answered_by: Optional[str] = None,
    language: Optional[str] = None,
    declined: Optional[bool] = None,
    sign: bool = True,
    handoff: Optional[HandoffCard] = None,
    used: Optional[List[Source]] = None,
) -> ChatResponse:
    """The reply in its one shape, signed unless it is failure copy (`sign`)."""
    return ChatResponse(
        response=response,
        email_collected=email_collected,
        is_email_collection=is_email_collection,
        trace=trace,
        blocks=blocks or [],
        answered_by=answered_by,
        language=language,
        declined=declined,
        sig=guard.sign_turn(response) if sign else None,
        handoff=handoff,
        used=used,
    )


# Shown instead of an answer that recites the rules. One sentence, back to
# the work, which is what the rules ask the model to say in that case anyway.
RULES_DECLINE = {
    "en": "That's not something I share here. Ask me about Yanir's work, his projects or what he writes about.",
    "he": "את זה אני לא משתף כאן. אפשר לשאול אותי על העבודה של יניר, הפרויקטים שלו או מה שהוא כותב.",
}

_rules_echo = guard.RulesEcho(RULES)


def checked_answer_text(text: str, language: str) -> str:
    """The model's answer after the output checks in guard.py."""
    if _rules_echo.matches(text):
        logger.warning("Answer quoted the rules; replaced with a decline")
        return RULES_DECLINE.get(language, RULES_DECLINE["en"])
    # Named first, checked second: naming turns a bare address into a link,
    # so the host check has to see the links naming made, not only the ones
    # the model wrote. A bare address to an unknown host ends up as its name
    # in plain text, never as something to click.
    return guard.clean_output(named_links(text, language))


# A bare address in the middle of a Hebrew sentence reads as noise and breaks
# the line's direction. Addresses the model writes on its own are turned into
# links with a short name: the known ones by what they are, any other by its
# host and path without the scheme. Links the model already named are left as
# they are.
LINK_NAMES = {
    "https://cal.com/yanirrot/zoom-call": {"he": "קביעת שיחה", "en": "book a call"},
}
_BARE_URL = re.compile(r"(?<!\]\()(?<![<\w/])https?://[^\s<>()\[\]]+")
_TRAILING = ".,;:!?\"'״׳"


def named_links(text: str, language: str) -> str:
    def name(match: "re.Match[str]") -> str:
        url = match.group(0)
        tail = ""
        while url and url[-1] in _TRAILING:
            url, tail = url[:-1], url[-1] + tail
        names = LINK_NAMES.get(url.rstrip("/"))
        label = (
            names.get(language, names["en"]) if names
            else re.sub(r"^https?://(www\.)?", "", url).rstrip("/")
        )
        return f"[{label}]({url}){tail}"

    return _BARE_URL.sub(name, text)


def answer_trace(
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
        cached_tokens=answer.cached_tokens,
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
