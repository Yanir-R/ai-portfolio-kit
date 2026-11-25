"""The shapes of what the API accepts and returns.

Every request body and every reply is a Pydantic model declared here, so the
contract with the site is one file, FastAPI validates a request before any
handler runs, and the site's TypeScript can be checked against it
(tests/test_contract.py).
"""

import datetime
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, EmailStr, Field

from gemini_helper import HandoffReason

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

# One replayed turn. It has to hold the longest answer the server itself sends:
# the page replays every answer as history, so a ceiling below that would turn
# one long answer into a 422 on every question after it. MAX_OUTPUT_TOKENS is
# 4,000 tokens, which is roughly 16,000 characters of Hebrew or English.
MAX_HISTORY_CONTENT_CHARS = 16_000

# Frontend message types that represent something the visitor actually said.
# Anything not listed here is UI chrome - 'system' and 'initial' are the greeting
# and error banners, and replaying them as conversation turns would teach the
# model that its own greeting was part of the dialogue. 'quick' is a canned
# question the visitor clicked, so it counts as a user turn.
USER_MESSAGE_TYPES = frozenset({"user", "quick"})
MODEL_MESSAGE_TYPES = frozenset({"ai"})


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
    # The page already offered a direct talk in this conversation (shown or
    # dismissed), so it is not offered again. Forging it only changes what
    # this visitor's own page shows.
    handoff_offered: bool = False
    # Asked by clicking a starter question that opens a drawing: the projects
    # the drawing shows are sent with it (selection.TOPIC_PROJECTS), so the
    # answer covers what the drawing beside it shows.
    topic: Optional[Literal["built", "legal", "pk"]] = None


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
    claim it warns about. The trace says what the model was *given*; which of
    those documents the answer drew on is a separate field,
    `ChatResponse.used`, taken from the model's own structured reply and kept
    only where it names a document that was sent.

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
    # The part of `prompt_tokens` Gemini served from its implicit cache: the
    # rules and profile that open every request.
    cached_tokens: Optional[int] = None
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


class HandoffCard(BaseModel):
    """An offer to continue with Yanir directly, drawn under the answer.

    `summary` is the model's short restatement of what the visitor said about
    their need, prefilled (editable) into the contact window.
    """

    # "last_answer" when the card is offered because the visitor's daily
    # answers are about to run out, whatever the model judged.
    reason: Union[HandoffReason, Literal["last_answer"]]
    summary: str = ""
    # One line in Yanir's voice on the kind of work that fits this need, from
    # the profile. Empty when the model gave none; the card then says the
    # fixed line for `reason`.
    fit: str = ""


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
    # The model's own word on whether it answered or declined, from its
    # structured reply. Absent when no model wrote the text or it did not say.
    declined: Optional[bool] = None
    # Sent back with this reply when it is replayed as history, proving the
    # server wrote it. See guard.py. Absent on failure copy (busy, cut short),
    # which is not part of the conversation and is not replayed to the model.
    sig: Optional[str] = None
    # Present when this is the moment to offer a direct talk; see
    # replies.handoff_card.
    handoff: Optional[HandoffCard] = None
    # The projects and posts the answer drew on, by the model's own word and
    # checked against what it was sent. Empty when it rested on Yanir's notes
    # alone; absent when the model did not say (see replies.used_sources).
    used: Optional[List[Source]] = None
