"""Choosing which of Yanir's documents a question actually needs.

Sending the whole corpus with every request would be affordable - a few dozen
documents against a context window of hundreds of thousands of tokens - but it
would leave the site unable to say anything true about *this* answer. A panel
reporting "33 documents" under every reply reports a property of the
deployment, not of the reply.

So this module answers one question: given what the visitor asked, which
documents belong in the request? Three rules shape it, and each comes from
something already decided in this project or in Yanir's own published work.

**Deterministic, not a model call.** An LLM framing pass would be a second
Gemini call per message - double the cost and the wait for every answer, and
twice as fast through the daily chat budget. This is the
"mostly deterministic routing, model only when ambiguous" split, and here the
deterministic half is sufficient.

**The signal comes from the corpus first.** Term weights are derived from the
documents themselves: a word appearing in every document distinguishes nothing
and scores zero, while a word appearing in one is decisive. "Build" is worthless
and "Moonsite" is conclusive, and neither fact was written down by hand.

**Each document also carries the words visitors use for it.** A visitor asks
about "a barbershop" and the write-up says "hair salons"; no weighting of the
document's own words can connect the two. `docs/search-phrases.json` lists, per
document, the phrasings people reach for in English and in Hebrew. They are
added to the document's terms for matching and are never sent to the model, so
a phrase there can route a question but cannot become a claim. A test fails when
a document has no entry or an entry names no document, which is what keeps the
list from rotting quietly.

**A miss is graded, not answered by sending everything.** Sending the whole
corpus whenever nothing matched would give the least-understood questions the
least selective answer. Instead there are three results:

- NARROWED: a document accounts for a real share of the question. It and any
  other document that does are sent, up to a small maximum.
- CLOSEST: something matched, but weakly. The few best-scoring documents are
  sent and reported as the closest found, not as chosen.
- UNMATCHED: nothing in the question is a word any document uses. Only Yanir's
  own notes are sent.

In all three the model is also given one line for every document whose body was
left out (`Knowledge.listed`). That line is what replaces sending everything: the
model can still tell a visitor that a write-up on the subject exists and point
them to it, and it does so from thirty words instead of three thousand.

The result is typed rather than being a bare corpus because the site reports
these differently. Yanir's own writing on tool-calling makes the point that
"nothing" is several different conditions wearing one face, and collapsing them
is the bug.
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
from dataclasses import dataclass, replace
from typing import Dict, FrozenSet, Iterable, Optional, Set, Tuple

from context import Knowledge, Section
from docs_helper import DOCS_DIR, get_writing_index
from prompt import HISTORY_TURNS

logger = logging.getLogger(__name__)

# How much of the question a document has to account for to be worth sending.
#
# Measured against the question, not against the winning document. Measuring
# against the winner means a document that happens to match everything raises
# the bar for every other one, and that suppressed a real answer: asked "why did
# an agent return nothing found?", the post titled "Nothing found." scored 2.3
# while a post matching all four terms scored 6.2, putting the threshold at 3.1
# and excluding the document the question named. A share of the question does
# not move when some other document does well.
QUERY_COVERAGE = 0.25

# Words shorter than this are dropped before scoring. Deliberately linguistic
# rather than domain-specific: "AI", "Go" and "k8s" are real terms, but so are
# "at", "my" and "do", and the weighting below already reduces a term that
# appears everywhere to nothing.
MIN_TERM_LENGTH = 3

# Ordinary English that carries no topic.
#
# Everything here is a *closed grammatical class* - articles, pronouns,
# prepositions, auxiliaries, quantifiers, and the number words below. That
# distinction is the point, and it is the same one that fixed the contact-flow
# trigger: a list of technical nouns is open-ended and starts rotting the day it
# is written, while the function words of English are finite and are not going
# to grow. No word appears here because of what this corpus happens to contain.
#
# The number words earn their place the hard way. "And what about the second
# ONE?" selected a single post, because "one" appears in exactly one document
# ("22.7 million tokens in one session") and weighting by rarity cannot tell a
# proper noun from a common word that happens to be rare here. Across ten
# documents that is a real limit of the measure, and the answer is to keep
# grammar out of the scoring rather than to tune the threshold around it.
#
# The owner's name is here too. Every document is about him, so his name
# cannot tell one from another; "why talk to Yanir?" matched a JavaScript post
# only because it happens to be signed. A fork replaces the name.
#
# Greetings belong here for the plainest reason available: they carry no topic,
# which is the whole definition of the list. Without them "hello there" produced
# a term that matched no document, which reads as an unknown subject and sends
# the entire corpus - ten documents fetched to say hello back.
_STOPWORDS: FrozenSet[str] = frozenset(
    """
    the and for you your yours are was were what when where which who whom why how
    with without within into onto over under between about across after before
    during while since until through against among along around because though
    although unless whether both each every all any some most more less few many
    much other another such same own just only also even still yet ever never
    always sometimes often rarely usually really quite very too enough back down
    out off  can could should would will shall may might must not yes his her
    their there here they them then than this that these those have has had did
    does done been being from tell told say said get got give given know known
    like want need make made use used using work works worked thing things stuff
    our ours talk talking

    yanir yanirs

    one two three four five six seven eight nine ten
    first second third fourth fifth last next previous former latter

    hi hey hello hiya howdy greetings morning afternoon evening
    thanks thank cheers please sorry welcome bye goodbye ok okay sure
    """.split()
)

# The same closed classes in Hebrew, for the same reason. Listed as people type
# them, attached prefixes included, because stopwords are matched before any
# prefix is removed.
_HEBREW_STOPWORDS: FrozenSet[str] = frozenset(
    """
    אני אתה את אתם אתן הוא היא הם הן אנחנו אנו זה זאת זו אלה אלו
    של שלי שלך שלו שלה שלנו שלכם שלהם על אל עם בלי בין לפני אחרי תחת מול אצל
    איתי איתך איתו איתה איתנו איתכם איתם
    אצלך אצלי כמו כדי בגלל למרות לגבי בשביל דרך לפי נגד ליד עד מאז
    מה מי איך איפה מתי למה מדוע כמה איזה איזו אילו האם ומה ומי ואיך ולמה
    גם רק עוד כבר אבל אולי כי אם או לא כן אין יש היה היתה הייתה היו יהיה
    כל כמה הרבה מעט יותר פחות מאוד קצת ממש בכלל תמיד לפעמים אף
    לי לך לו לה לנו לכם להם בי בך בו בה בנו בהם אותי אותך אותו אותה אותנו אותם
    פה כאן שם אז עכשיו היום אחר אחרת אחרים כזה כזאת כאלה
    יכול יכולה אפשר צריך צריכה רוצה רוצים עושה עשית עשה לעשות
    ספר תספר ספרי תגיד תגידי אמר תן תני דבר דברים משהו פעם פעמים

    יניר ליניר שיניר ויניר מיניר
    לדבר דווקא

    אחד אחת שתיים שניים שלוש ארבע חמש שש שבע שמונה תשע עשר
    ראשון ראשונה שני שנייה שלישי אחרון אחרונה הבא הבאה הקודם הקודמת

    שלום שלומך שלומכם נשמע קורה היי הי אהלן בוקר ערב לילה צהריים טוב טובה
    תודה רבה בבקשה סליחה ביי להתראות בסדר אוקיי
    """.split()
)

# A word starts with a Latin letter or digit, or is a run of Hebrew letters.
# A Hebrew document names tools and projects in Latin letters, so both kinds
# are read from every text whatever language it is in.
_TERM_RE = re.compile(r"[a-z0-9][a-z0-9+.#-]*|[\u05d0-\u05ea]+")

# One-letter particles Hebrew attaches to the front of a word: and, the, in,
# to, from, that, as.
_HEBREW_PREFIXES = "והבלמשכ"

# Final letter forms and the regular form each reduces to.
_HEBREW_FINALS = str.maketrans("ךםןףץ", "כמנפצ")

# Shortest stem worth reducing to. Below this, stripping an ending does more
# damage than the match is worth ("uses" would become "us").
MIN_STEM_LENGTH = 4


def _stem(token: str) -> str:
    """Reduces a word to a form its other inflections also reduce to.

    Exact matching missed the obvious: a post titled "$340 burned" did not match
    a question about token burn, and the most distinctive word in the question
    was scored against the wrong document as a result. Plurals fail the same way
    every time somebody types the singular.

    Correct linguistics is not the goal - agreement is. "Nothing" reducing to
    "noth" is fine, because every occurrence in every document reduces to it
    too. Plural is stripped before the verb endings so that "meanings",
    "meaning" and "mean" all arrive at the same place; doing it the other way
    round leaves the plural one suffix behind the singular.
    """
    if "\u05d0" <= token[0] <= "\u05ea":
        return _stem_hebrew(token)

    for suffix, replacement in (("ies", "y"), ("es", ""), ("s", "")):
        if token.endswith(suffix) and len(token) - len(suffix) + len(replacement) >= MIN_STEM_LENGTH:
            token = token[: -len(suffix)] + replacement
            break

    for suffix in ("ing", "ed"):
        if token.endswith(suffix) and len(token) - len(suffix) >= MIN_STEM_LENGTH:
            stem = token[: -len(suffix)]
            # "running" is "run" with its last letter doubled, and has to arrive
            # where "run" does. Letters English doubles in the base
            # word itself are left alone, so "calling" stays "call".
            if stem[-1] == stem[-2] and stem[-1] not in "lsfz":
                stem = stem[:-1]
            return stem

    return token


def _stem_hebrew(token: str) -> str:
    """The Hebrew counterpart of `_stem`, with the same goal: agreement.

    Hebrew writes "and", "the", "in", "to" and "from" as letters attached to the
    word, so "הסוכנים", "לסוכנים" and "סוכן" share no exact form. Up to two
    attached particles and a plural ending ("סוכנים", "סוכני") are removed, and a final letter is
    written in its regular form so a word matches itself with an ending on.

    A word that merely starts with one of those letters loses it too. That is
    harmless for the reason given above: it loses the same letter everywhere.
    """
    for _ in range(2):
        if token[0] in _HEBREW_PREFIXES and len(token) - 1 >= MIN_TERM_LENGTH:
            token = token[1:]

    for suffix in ("ים", "ות", "י"):
        if token.endswith(suffix) and len(token) - len(suffix) >= MIN_TERM_LENGTH:
            token = token[: -len(suffix)]
            break

    return token.translate(_HEBREW_FINALS)


def _terms(text: str) -> Set[str]:
    """Distinct topic-bearing words in `text`, reduced to their stems.

    A set rather than a count: whether a document mentions a term ten times or
    once says little at this corpus size, and repetition would let one long
    document dominate every question.

    Stopwords are matched before stemming, so the list stays readable as the
    words people actually type.
    """
    return {
        _stem(token)
        for token in _TERM_RE.findall(text.lower())
        if len(token) >= MIN_TERM_LENGTH
        and token not in _STOPWORDS
        and token not in _HEBREW_STOPWORDS
    }


@dataclass(frozen=True)
class _Index:
    """Per-document terms and the weight of each term across the corpus."""

    terms: Tuple[Tuple[str, FrozenSet[str]], ...]
    weights: Dict[str, float]


# The index of each corpus it was last built from, one per language. The corpus
# is itself cached against file mtimes, so an entry is rebuilt only when its
# corpus is. Keyed on the corpus rather than on its labels: the English and
# Hebrew corpora can carry the same labels over different text.
_index_cache: Dict[Knowledge, _Index] = {}

# One entry per language is all that is ever current. A rebuilt corpus adds new
# entries, so the cache is emptied rather than left to grow.
_INDEX_CACHE_LIMIT = 4


SEARCH_PHRASES_PATH = os.path.join(DOCS_DIR, "search-phrases.json")


def _search_phrases() -> Dict[str, Tuple[str, ...]]:
    """The phrasings visitors use for each document, keyed by "kind/slug".

    Read when an index is built, which is once per corpus. A missing or broken
    file costs the extra matches and nothing else: selection falls back to the
    documents' own words, as it worked before the file existed.
    """
    try:
        with open(SEARCH_PHRASES_PATH, encoding="utf-8") as file:
            loaded = json.load(file)
        return {key: tuple(str(phrase) for phrase in value) for key, value in loaded.items()}
    except (OSError, ValueError, AttributeError, TypeError):
        logger.exception("Could not read %s; matching on document text only", SEARCH_PHRASES_PATH)
        return {}


def _build_index(knowledge: Knowledge) -> _Index:
    """Weighs every term by how many documents it fails to distinguish.

    A term in all ten documents scores zero - it cannot separate them, so
    matching it is not evidence of anything. A term in one scores highest. This
    is the whole reason no keyword list is needed: the corpus states its own
    distinctive vocabulary, and restates it whenever a document is added.
    """
    phrases = _search_phrases()
    per_section = tuple(
        (
            section.label,
            frozenset(
                _terms(
                    f"{section.label}\n{section.body}\n"
                    + "\n".join(phrases.get(f"{section.source}/{section.slug}", ()))
                )
            ),
        )
        for section in knowledge.sections
    )

    total = len(per_section)
    document_count: Dict[str, int] = {}
    for _, terms in per_section:
        for term in terms:
            document_count[term] = document_count.get(term, 0) + 1

    # log(N/df): zero when a term is everywhere, largest when it is unique.
    weights = {term: math.log(total / count) for term, count in document_count.items()}
    return _Index(terms=per_section, weights=weights)


def _index_for(knowledge: Knowledge) -> _Index:
    index = _index_cache.get(knowledge)
    if index is None:
        if len(_index_cache) >= _INDEX_CACHE_LIMIT:
            _index_cache.clear()
        index = _index_cache[knowledge] = _build_index(knowledge)
    return index


# What the selection concluded. States rather than a bare corpus, because "we
# chose these", "these are only the closest we found" and "nothing matched" are
# different facts about an answer, and the site reports them differently.
NARROWED = "narrowed"
CLOSEST = "closest"
UNMATCHED = "unmatched"
CONVERSATIONAL = "conversational"
NO_CORPUS = "no_corpus"
# Everything was sent because there was no profile to fall back on. Selection
# no longer chooses this for a question it could not place; it remains for the
# one corpus shape where leaving documents out would leave nothing.
UNFOCUSED = "unfocused"

# How many recent turns are read when the message itself says nothing topical.
# Matches the history the model is replayed, so what frames the search is what
# the model can actually see.
FRAMING_TURNS = HISTORY_TURNS

# The most documents sent beside the profile. A question that five documents
# each answer a quarter of is not asking about five documents, and the ones
# left out are still named to the model in one line each.
MAX_DOCUMENTS = 3

# The projects behind each starter question's drawing. The page sends the
# starter's topic with the question, and these are always sent with it, so the
# answer and the drawing beside it describe the same systems. Word matching
# alone cannot be trusted with this: "agents" is in nearly every document, so
# it weighs nothing, and "what has Yanir built with agents?" would reach only
# whichever project happens to share the word "built".
TOPIC_PROJECTS: Dict[str, Tuple[str, ...]] = {
    "built": ("review-engine", "agent-fleet", "personakit"),
    "legal": ("trinity-legal",),
    "pk": ("personakit",),
}

# The share of the whole question the best document must account for to count
# as a match rather than as the closest thing found. "The whole question"
# includes words no document uses, each weighed as heavily as a word can be:
# asked about the weather in Tel Aviv, a write-up that happens to contain one
# of those words has matched a quarter of the question, not all of it.
STRONG_COVERAGE = 0.3


@dataclass(frozen=True)
class Selection:
    """Which documents a question gets, and why that set."""

    knowledge: Knowledge
    outcome: str
    available: int
    # Set when the question is about Yanir's writing as such ("what have you
    # written about X?", "your latest posts"). `writing` holds the slugs of the
    # pieces that answer it, best first, at most MAX_WRITING_ITEMS; the site
    # draws them as cards without asking the model which ones it meant.
    writing_intent: str = ""
    writing: Tuple[str, ...] = ()
    writing_total: int = 0
    # The topic id a follow-up list is about ("what else did you write about
    # that?"), so the site can say which subject it continued.
    writing_ref: str = ""
    # Asked about the writing, on a subject it does not cover. The answer comes
    # from the ordinary search; the site offers the subjects that are covered.
    writing_unmatched: bool = False

    @property
    def narrowed(self) -> bool:
        return self.outcome == NARROWED


def _with_the_rest_listed(chosen: Tuple[Section, ...], knowledge: Knowledge) -> Knowledge:
    """`chosen` in full, and one line for every other document."""
    kept = set(chosen)
    return Knowledge(
        sections=chosen,
        listed=tuple(section for section in knowledge.sections if section not in kept),
    )


def _profile_only(knowledge: Knowledge, available: int, outcome: str) -> Selection:
    """The least a reply can be built on without the corpus failing closed.

    Not an empty corpus: `get_gemini_response` refuses to answer at all without
    one, and greeting a visitor with "I can't reach my notes" would turn the
    cheapest exchange on the site into its most alarming.
    """
    profile = tuple(section for section in knowledge.sections if section.is_profile)
    if not profile:
        return Selection(knowledge=knowledge, outcome=UNFOCUSED, available=available)

    logger.info("Selection: %s, sending %d profile documents", outcome, len(profile))
    return Selection(
        knowledge=_with_the_rest_listed(profile, knowledge),
        outcome=outcome,
        available=available,
    )


# --- questions about the writing itself -------------------------------------
#
# "What have you written about memory?" is two questions in one: which of
# Yanir's documents are *writing*, and which of those are about memory. Scored
# like any other question, the first half poisons the second: "written",
# "post" and "article" are words some documents happen to contain, so the
# closest match was whichever post said "post" most distinctively, and in
# Hebrew "פוסט" pointed at the one Hebrew post that used it.
#
# So words that say *this is about the writing* are taken out of the question
# and turned into a filter instead: only writing competes, and only on the
# words that are left. They are a closed set (the names of the forms and of
# the places they were published), which is why a list is safe here when a
# list of topics would not be.
WRITING_INTENT_WORDS = """
    article articles post posts posted blog blogs written write writing
    publish published publication linkedin medium series piece pieces essay
    writes מאמר מאמרים פוסט פוסטים בלוג כתבת כתבתי כתיבה כותב כותבת לכתוב פרסמת פרסום פרסומים
    לינקדאין לינקדין מדיום סדרה סדרת
"""
# Asking for the newest rather than for a subject. Read only together with a
# writing word: "your latest project" is not about the writing.
RECENCY_WORDS = """
    latest recent recently newest new lately
    אחרון האחרון אחרונים האחרונים לאחרונה חדש החדש
"""
# How a visitor asks for a list, as opposed to what it should be about. Only
# removed from a question already known to be about the writing; elsewhere
# "show" can be a subject.
REQUEST_WORDS = """
    show list summarize summarise summary share send give find anything something everything
    תראה הראה תראי תציג הצג תסכם סכם סיכום תשתף שתף משהו כלום הכל
"""
# Asking to continue: "what else", "more on that". Read only together with a
# writing word and a piece already shown.
MORE_WORDS = """
    more else another other others further
    עוד נוסף נוספים נוספת אחר אחרים אחרת
"""
_MORE_TERMS: FrozenSet[str] = frozenset()
# Most of these are stopwords, so they are read from the raw words of the
# question rather than from its terms. A leading "and" (ו) is allowed.
_MORE_WORDS_RAW: FrozenSet[str] = frozenset(MORE_WORDS.split())
_WORD_RE = re.compile(r"[a-z]+|[\u05d0-\u05ea]+")


def _asks_for_more(question: str) -> bool:
    for word in _WORD_RE.findall(question.lower()):
        if word in _MORE_WORDS_RAW or (word.startswith("ו") and word[1:] in _MORE_WORDS_RAW):
            return True
    return False

_REQUEST_TERMS: FrozenSet[str] = frozenset()
_WRITING_TERMS: FrozenSet[str] = frozenset()
_RECENCY_TERMS: FrozenSet[str] = frozenset()

# How far the best piece may fall behind the best other document on the same
# subject before the question is treated as not really about the writing.
WRITING_DEFERS_BELOW = 0.5

# The most pieces a writing answer names. Matches the site's list card.
MAX_WRITING_ITEMS = 5

# What a writing question turned out to be. The site draws each differently.
WRITING_TOPIC = "topic"      # about a subject: the pieces on it
WRITING_RECENT = "recent"    # the newest pieces
WRITING_ALL = "all"          # the writing as a whole: what exists
WRITING_RELATED = "related"  # not asked about the writing, but a piece answers it
WRITING_MORE = "more"        # a follow-up: the other pieces on what was shown
WRITING_CONTEXT = "context"  # asked from a piece's own page


def _intent_terms() -> Tuple[FrozenSet[str], FrozenSet[str]]:
    global _WRITING_TERMS, _RECENCY_TERMS, _REQUEST_TERMS, _MORE_TERMS
    if not _WRITING_TERMS:
        _WRITING_TERMS = frozenset(_terms(WRITING_INTENT_WORDS))
        _RECENCY_TERMS = frozenset(_terms(RECENCY_WORDS))
        _REQUEST_TERMS = frozenset(_terms(REQUEST_WORDS))
        _MORE_TERMS = frozenset(_terms(MORE_WORDS))
    return _WRITING_TERMS, _RECENCY_TERMS


def _more_like_shown(pieces: list, shown: Tuple[str, ...]) -> Tuple[str, list]:
    """The other pieces on what was last shown, and that topic's id.

    "That" is the last piece shown, and its subject is the first topic the
    index gives it. Only when nothing else is on that topic does the list widen
    to the piece's other topics. Newest first.
    """
    topics_of = {
        slug: list(entry.get("topics", []))
        for slug, entry in get_writing_index()["pieces"].items()
    }
    last = next((slug for slug in reversed(shown) if topics_of.get(slug)), None)
    if last is None:
        return "", []
    unseen = [s for s in pieces if s.slug not in shown]
    for topic in topics_of[last]:
        on_it = [s for s in unseen if topic in topics_of.get(s.slug, ())]
        if on_it:
            return topic, sorted(on_it, key=lambda s: s.date, reverse=True)
    return topics_of[last][0], []


def _writing_selection(
    asked: Set[str],
    knowledge: Knowledge,
    index: "_Index",
    available: int,
    shown: Tuple[str, ...] = (),
    more: bool = False,
) -> "Selection | None":
    """The answer to a question about the writing, or None if it is not one."""
    writing_words, recency_words = _intent_terms()
    if not asked & writing_words:
        return None

    pieces = [s for s in knowledge.sections if s.source == "writing"]
    if not pieces:
        return None
    newest_first = sorted(pieces, key=lambda s: s.date, reverse=True)
    topic = asked - writing_words - recency_words - _REQUEST_TERMS - _MORE_TERMS
    ref = ""

    if not topic and shown and more:
        # "What else did you write about that?" The subject is whatever was
        # just shown, and what was shown is not shown again.
        ref, ordered = _more_like_shown(pieces, shown)
        intent = WRITING_MORE
        topic = set()
    if ref:
        pass
    elif topic:
        terms_of = dict(index.terms)
        scores = {
            s.label: sum(index.weights.get(t, 0.0) for t in topic & terms_of.get(s.label, frozenset()))
            for s in pieces
        }
        best = max(scores.values(), default=0.0)
        # The best any other document does on the same subject. "Did you write
        # the code for Trinity Legal?" says "write" but is about a project, and
        # the project answers it far better than any post that mentions code.
        elsewhere = max(
            (
                sum(index.weights.get(t, 0.0) for t in topic & terms)
                for label, terms in index.terms
                if not label.startswith(("Writing / ", "Profile / "))
            ),
            default=0.0,
        )
        if best <= 0:
            # Asked about the writing, on a subject it does not cover. The
            # ordinary search answers; the site offers what is covered.
            return _UNMATCHED_WRITING
        if best < elsewhere * WRITING_DEFERS_BELOW:
            # Something else covers the subject much better. Let the ordinary
            # search have it.
            return None
        threshold = sum(index.weights.get(t, 0.0) for t in topic) * QUERY_COVERAGE
        matching = sorted(
            (s for s in pieces if scores[s.label] > 0 and (scores[s.label] >= threshold or scores[s.label] == best)),
            key=lambda s: (scores[s.label], s.date),
            reverse=True,
        )
        intent, ordered = WRITING_TOPIC, [s for s in matching if s.slug not in shown] or matching
    elif asked & recency_words:
        intent, ordered = WRITING_RECENT, newest_first
    else:
        intent, ordered = WRITING_ALL, newest_first

    # Bodies for the few that answer it; one dated line for every other piece,
    # which is enough to list the rest without sending them.
    send = () if intent == WRITING_ALL else tuple(ordered[:MAX_DOCUMENTS])
    kept = set(send)
    chosen = tuple(s for s in knowledge.sections if s.is_profile or s in kept)
    items = tuple(s.slug for s in ordered[:MAX_WRITING_ITEMS] if s.slug)

    logger.info(
        "Selection: writing/%s, %d of %d documents, %d pieces matched",
        intent, len(chosen), available, len(ordered),
    )
    return Selection(
        knowledge=_with_the_rest_listed(chosen, knowledge),
        outcome=NARROWED,
        available=available,
        writing_intent=intent,
        writing=items,
        writing_total=len(ordered),
        writing_ref=ref,
    )


# Returned by _writing_selection for "asked about the writing, nothing on it".
# A sentinel rather than a Selection: the ordinary search still has to run.
_UNMATCHED_WRITING = object()


def _same_series(slugs: Tuple[str, ...]) -> bool:
    """Whether at least two of `slugs` are parts of one series."""
    for series in get_writing_index()["series"]:
        members = {part["slug"] for part in series.get("parts", [])}
        if sum(1 for slug in slugs if slug in members) >= 2:
            return True
    return False


def _pinned_to(selection: Selection, knowledge: Knowledge, pinned: str) -> Selection:
    """`selection` with the piece the visitor is reading always sent in full.

    Asked from a piece's own page, "what does the engine actually do?" is about
    that piece whatever its words match. Whatever else the search chose still
    goes, up to the usual limit, so a question that reaches past the piece can
    still be answered.
    """
    piece = next(
        (s for s in knowledge.sections if s.source == "writing" and s.slug == pinned), None
    )
    if piece is None:
        return selection
    others = [
        s for s in selection.knowledge.sections
        if not s.is_profile and s is not piece and s.slug != pinned
    ][: MAX_DOCUMENTS - 1]
    kept = set(others) | {piece}
    chosen = tuple(s for s in knowledge.sections if s.is_profile or s in kept)
    if selection.writing_intent in ("", WRITING_RELATED):
        selection = replace(
            selection,
            writing_intent=WRITING_CONTEXT,
            writing=(pinned,),
            writing_total=1,
        )
    return replace(
        selection,
        knowledge=_with_the_rest_listed(chosen, knowledge),
        outcome=NARROWED,
    )


def _with_projects(selection: Selection, knowledge: Knowledge, slugs: Tuple[str, ...]) -> Selection:
    """`selection` with the projects in `slugs` always sent in full.

    They take the first places; whatever the search chose fills what is left
    of MAX_DOCUMENTS, so the writing a question reaches still has room when
    the topic needs fewer than the limit. Slugs not in the corpus are skipped.
    """
    wanted = tuple(
        s for slug in slugs for s in knowledge.sections if s.source == "project" and s.slug == slug
    )
    if not wanted:
        return selection
    others = [
        s for s in selection.knowledge.sections if not s.is_profile and s not in wanted
    ][: max(MAX_DOCUMENTS - len(wanted), 0)]
    kept = set(others) | set(wanted)
    chosen = tuple(s for s in knowledge.sections if s.is_profile or s in kept)
    # A related piece of writing that no longer fits is not shown as a card
    # either: a card is only ever for something the answer was given.
    sent = {s.slug for s in chosen if s.source == "writing"}
    writing = selection.writing
    if selection.writing_intent == WRITING_RELATED:
        writing = tuple(slug for slug in writing if slug in sent)
    return replace(
        selection,
        knowledge=_with_the_rest_listed(chosen, knowledge),
        outcome=NARROWED,
        writing=writing,
        writing_total=len(writing) if selection.writing_intent == WRITING_RELATED else selection.writing_total,
        writing_intent=selection.writing_intent if writing or selection.writing_intent != WRITING_RELATED else "",
    )


def select(
    question: str,
    knowledge: Knowledge,
    history: Iterable[str] | None = None,
    pinned: Optional[str] = None,
    shown: Iterable[str] = (),
    topic: Optional[str] = None,
) -> Selection:
    """`_select`, then the piece the visitor is reading and the projects of the
    starter question's topic, when there are any."""
    selection = _select(question, knowledge, history, tuple(shown or ()))
    if pinned and not knowledge.is_empty:
        selection = _pinned_to(selection, knowledge, pinned)
    if topic and not knowledge.is_empty:
        selection = _with_projects(selection, knowledge, TOPIC_PROJECTS.get(topic, ()))
    return selection


def _select(
    question: str,
    knowledge: Knowledge,
    history: Iterable[str] | None,
    shown: Tuple[str, ...],
) -> Selection:
    """Picks the documents worth sending for `question`.

    Yanir's own notes are always included. The chat answers on his behalf
    about him, so his profile is not a topic that competes with the others - it
    is the ground every answer stands on, and a question that turns out to be
    about him after all must never find it missing.
    """
    if knowledge.is_empty:
        return Selection(knowledge=knowledge, outcome=NO_CORPUS, available=0)

    available = len(knowledge.sections)
    index = _index_for(knowledge)
    asked = _terms(question)

    # Nothing topical in the message itself. Two different situations look
    # identical here and need opposite handling, and what separates them is
    # whether there is a conversation to be continuing.
    #
    # "And what about the second one?" is a real question whose subject is in
    # the previous turns rather than in this message, so the recent turns are
    # what the search gets framed with - the same turns the model is replayed,
    # so the framing cannot reach for something the model cannot see.
    #
    # "Hi" is not a question at all, and gets the profile and nothing else.
    if not asked:
        asked = _terms("\n".join(list(history or [])[-FRAMING_TURNS:]))
        if not asked:
            return _profile_only(knowledge, available, CONVERSATIONAL)

    writing = _writing_selection(
        asked, knowledge, index, available, shown, more=bool(shown) and _asks_for_more(question)
    )
    unmatched_writing = writing is _UNMATCHED_WRITING
    if writing is not None and not unmatched_writing:
        return writing
    if unmatched_writing:
        # The form words would only find the writing again, which has nothing
        # on this. The rest of the corpus is searched on the subject alone.
        writing_words, recency_words = _intent_terms()
        asked = asked - writing_words - recency_words - _REQUEST_TERMS - _MORE_TERMS

    scores: Dict[str, float] = {}
    for label, terms in index.terms:
        scores[label] = sum(index.weights.get(term, 0.0) for term in asked & terms)

    best = max(scores.values(), default=0.0)

    # No word in the question is one that distinguishes any document.
    if best <= 0:
        selection = _profile_only(knowledge, available, UNMATCHED)
        return replace(selection, writing_unmatched=unmatched_writing)

    # The weight of everything asked that this corpus recognises at all, which
    # is what a document's score is a share of.
    asked_weight = sum(index.weights.get(term, 0.0) for term in asked)
    threshold = asked_weight * QUERY_COVERAGE

    # The best match is kept whatever its share. Spread a question's terms
    # across enough documents and every one of them falls under the threshold,
    # which would drop the closest thing to an answer the corpus has.
    ranked = sorted(
        (
            section
            for section in knowledge.sections
            if not section.is_profile
            and scores[section.label] > 0
            and (scores[section.label] >= threshold or scores[section.label] == best)
        ),
        key=lambda section: scores[section.label],
        reverse=True,
    )[:MAX_DOCUMENTS]

    # Kept in corpus order, so the request reads the same whatever was asked.
    kept = set(ranked)
    chosen = tuple(
        section for section in knowledge.sections if section.is_profile or section in kept
    )

    # A word no document uses weighs as much as a word can: log(N), the weight
    # of a word found in exactly one.
    unknown = sum(1 for term in asked if term not in index.weights)
    whole_question = asked_weight + unknown * math.log(max(available, 2))
    outcome = NARROWED if best >= whole_question * STRONG_COVERAGE else CLOSEST

    logger.info(
        "Selection: %s, %d of %d documents (%s)",
        outcome,
        len(chosen),
        available,
        ", ".join(s.label for s in chosen),
    )
    # A question that was not about the writing can still be answered by it:
    # "what do you think about agents asking for approval?" is an opinion, and
    # the post where he wrote it is the evidence. Those pieces travel with the
    # answer as cards, best first, without the model being asked to pick them.
    # Pieces already shown are not shown again, except as part of a series
    # card: the site decides that from the full list.
    related = tuple(s.slug for s in ranked if s.source == "writing" and s.slug)[:2]
    if not _same_series(related):
        related = tuple(slug for slug in related if slug not in shown)

    return Selection(
        knowledge=_with_the_rest_listed(chosen, knowledge),
        outcome=outcome,
        available=available,
        writing_intent=WRITING_RELATED if related else "",
        writing=related,
        writing_total=len(related),
        writing_unmatched=unmatched_writing and not related,
    )


def _reset_cache() -> None:
    """Drops the term index. For tests that rebuild the corpus underneath it."""
    _index_cache.clear()
