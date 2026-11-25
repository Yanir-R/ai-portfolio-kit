"""The chat: one route that answers a visitor's message.

A message is handled in this order, and the first step that applies answers:

1. An address on its own, or inside a reply to a request for one: it is
   mailed to Yanir (mailer.py) and the chat says so.
2. A request to be contacted: the chat asks for an address.
3. "What did you write lately": answered from the writing index, no model.
4. Everything else: the documents for the question are chosen
   (selection.py), the model answers (gemini_helper.py), and the reply is
   assembled around its answer (replies.py).

Only step 4 spends the visitor's daily answers, because only it calls the
model.
"""

import logging
import re

from email_validator import EmailNotValidError
from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool

import guard
import mailer
import rate_limit
import replies
import settings
from context import get_knowledge, reading_brief
from docs_helper import get_all_writing
from gemini_helper import get_gemini_response
from language import detect_language
from schemas import ChatRequest, ChatResponse, Source
from selection import select

logger = logging.getLogger(__name__)

router = APIRouter()

# Replies for the contact flow, in one place so the three paths that can accept
# an address cannot drift into three different voices. The chat is Yanir's agent,
# speaking about him, and its whole argument is that it does not overstate. A
# confirmation is the one message a visitor is guaranteed to read, so it is the
# worst place to sound like a different product.
EMAIL_RECEIVED_MESSAGE = (
    "Got it - that's in Yanir's inbox and he'll reply from there. "
    "Anything else you want to ask while you're here?"
)

EMAIL_INVALID_MESSAGE = (
    "That address doesn't look right. Check it and send it again, "
    "or write to rotyanir@gmail.com directly."
)

EMAIL_REQUEST_MESSAGE = (
    "Sure. Leave your email address here with a line about what you'd like to "
    "discuss, and Yanir will get back to you directly."
)

# Sending is best-effort from the visitor's side: if SMTP is down, telling them
# the message vanished is worse than giving them the address to use instead.
EMAIL_SEND_FAILED_MESSAGE = (
    "I couldn't get that through to Yanir's inbox just now - something on my side. "
    "Write to rotyanir@gmail.com directly and it will reach him."
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


async def deliver_collected_email(
    email: str, message_content: str, context: str
) -> ChatResponse:
    """Emails an address collected in chat and returns the reply to show for it.

    Both places that accept an address route through here so a delivery failure
    reads the same either way.
    """
    try:
        await mailer.send_contact_email(email, message_content)
    except HTTPException:
        # A delivery failure is ours, not the visitor's. Reporting it as a 500
        # would leave them staring at a generic error with no idea their message
        # went nowhere.
        logger.exception("Contact delivery failed for %s", context)
        return replies.chat_reply(EMAIL_SEND_FAILED_MESSAGE)

    # The address is delivered by email, which is the record. There is no reason
    # for it to sit in log storage as well.
    logger.info("Email notification sent for %s", context)
    return replies.chat_reply(EMAIL_RECEIVED_MESSAGE, email_collected=True)


@router.get("/api/chat/status")
async def chat_status():
    """Whether the chat has anything to ground its answers in.

    One boolean, because that is all the frontend needs to decide whether to show
    its "no content available" banner. Reporting filesystem paths, the working
    directory or the document filenames would hand an anonymous caller a map of
    the container for no gain.
    """
    knowledge = get_knowledge()
    return {"knowledge_ready": not knowledge.is_empty}

@router.post("/chat-with-files", response_model=ChatResponse)
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
                email = mailer.validated_address(message)
            except EmailNotValidError:
                return replies.chat_reply(EMAIL_INVALID_MESSAGE, is_email_collection=True)

            # Sending mail is a contact action, so it spends the contact
            # budget, not a chat answer.
            rate_limit.enforce_rate_limit(request, rate_limit.contact_limiter, "chat-with-files")
            return await deliver_collected_email(
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
                    email = mailer.validated_address(email_match.group(0))
                except EmailNotValidError:
                    return replies.chat_reply(EMAIL_INVALID_MESSAGE, is_email_collection=True)

                # Whatever they wrote around the address is the message itself.
                # The address is removed as typed: validation lower-cases the
                # domain, so the normalised form may not occur in the message.
                message_content = chat_request.message.replace(
                    email_match.group(0), ''
                ).strip()
                if not message_content:
                    message_content = "Email provided during chat interaction"

                rate_limit.enforce_rate_limit(request, rate_limit.contact_limiter, "chat-with-files")
                return await deliver_collected_email(
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
            return replies.chat_reply(EMAIL_REQUEST_MESSAGE, is_email_collection=True)

        # Normal chat flow - answer from the cached corpus (profile, projects,
        # writing).
        #
        # Which documents this question needs, rather than all of them. The
        # selection is held in a local so the trace describes the request that
        # was actually made - calling select() again for the trace could
        # describe a different one if the corpus rebuilt in between.
        turns = replies.to_model_turns(chat_request.conversation_history)

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
            topic=chat_request.topic,
        )

        if selection.writing_intent == "recent" and not chat_request.context:
            blocks = replies.writing_blocks(selection)
            replies.log_chat_audit(language, selection, blocks, answered_by="index")
            # Its sources are the pieces it lists: every reply names what it
            # stands on, a reply written without the model included.
            titles = {entry["slug"]: entry["title"] for entry in get_all_writing()}
            listed = [
                Source(kind="writing", slug=slug, title=titles[slug])
                for slug in selection.writing
                if slug in titles
            ]
            return replies.chat_reply(
                replies.RECENT_REPLY[language],
                blocks=blocks,
                answered_by="index",
                language=language,
                used=listed,
            )

        # The chat budget is spent here and not at the top of the handler: every
        # reply above this line, including the "what did you write lately" list,
        # is produced without calling the model, and a budget sized to the
        # model's daily quota should only count model calls.
        rate_limit.enforce_rate_limit(request, rate_limit.chat_limiter, "chat-with-files")

        if not settings.GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY is not set; chat cannot answer")
            raise HTTPException(status_code=500, detail=settings.INTERNAL_ERROR_DETAIL)

        # Asked from a piece's page: the model is told which piece "it" and
        # "this" mean, where it was published, its place in a series and any
        # note that corrects it since. Built from the corpus, never from the
        # request, and sent beside the corpus so the visitor's turn stays
        # exactly what they typed.
        reading = chat_request.context.ref if chat_request.context else None
        brief = reading_brief(reading, language) if reading else ""

        # The SDK call is synchronous and can take over a minute. Run in the
        # threadpool so it does not block the event loop, which would stall
        # every other request, health checks included, until it returned.
        answer = await run_in_threadpool(
            get_gemini_response,
            settings.GEMINI_API_KEY,
            chat_request.message,
            selection.knowledge,
            turns,
            brief,
        )

        blocks = (
            replies.writing_blocks(selection, reading, answer) if answer.written_by_model else []
        )
        handoff = replies.handoff_card(
            answer,
            chat_request,
            last_answer=rate_limit.chat_limiter.remaining(rate_limit.client_key(request)) == 0,
        )
        replies.log_chat_audit(
            language, selection, blocks,
            answered_by="model" if answer.from_model else None,
            context=reading,
            shown=len(chat_request.shown),
            history=replies.history_counts(chat_request.conversation_history, turns),
            answer=answer,
            handoff=handoff,
        )

        written = answer.written_by_model
        return replies.chat_reply(
            replies.checked_answer_text(answer.text, language) if written else answer.text,
            trace=replies.answer_trace(answer, selection, language),
            blocks=blocks,
            answered_by="model" if answer.from_model else None,
            language=language,
            declined=answer.declined if written else None,
            # Failure copy is not signed, so the next request does not replay
            # "I'm getting more questions than I can keep up with" to the model
            # as something it said.
            sign=written,
            handoff=handoff,
            used=replies.used_sources(selection, answer),
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in chat_with_files")
        raise HTTPException(status_code=500, detail=settings.INTERNAL_ERROR_DETAIL)
