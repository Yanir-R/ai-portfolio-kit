"""Assembles everything the chat is allowed to know about Yanir.

This is the single place the corpus is built. Nothing else reads the docs
directories for chat purposes, so "what does the model know" has exactly one
answer and one place to change.

Two properties are deliberate:

**It is cached against file mtimes, not loaded per request.** Parsing every
markdown and PDF on each chat message is affordable at this size, but it leaves
the cost of the corpus invisible - nothing reports how much context a request is
paying for. Here it is loaded once, logged once with its token estimate, and
rebuilt only when a file actually changes.

**An empty corpus is an error, not a fallback.** `docs/templates/` holds
placeholder files (`[brief story]`, `[your main programming languages]`) as a
starting point for anyone forking this repo. Falling back to them when the
profile directory is empty would mean a misconfigured deploy answering visitors
from placeholders in a confident first person instead of failing. Templates are
documentation; they are never sent to the model.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from typing import Dict, List, Tuple

from docs_helper import (
    HEBREW_DIR,
    PROFILE_DIR,
    PROJECTS_DIR,
    WRITING_DIR,
    get_all_projects,
    get_all_writing,
    get_writing_by_slug,
    get_writing_index,
    read_markdown_file,
    read_pdf_file,
)

logger = logging.getLogger(__name__)

# Rough characters-per-token for English prose. Used only for logging and for
# deciding when selectivity is worth building - never for a hard limit, so an
# approximation is fine.
CHARS_PER_TOKEN = 4

# Purely advisory. If the logged estimate crosses this, the corpus has grown
# past the point where sending all of it on every request is obviously correct,
# and it is time to look at tag routing or retrieval. Nothing enforces it.
CONTEXT_REVIEW_TOKENS = 20_000


# The label prefixes `_build` writes, paired with the word the site uses for
# that kind of document when it tells a visitor what an answer was grounded in.
#
# This lives here because this module owns the label format. A counter written
# anywhere else would keep returning a confident number on the day a prefix
# changes, and quietly count nothing.
SECTION_KINDS = (
    ("Profile / ", "note"),
    ("Project / ", "project write-up"),
    ("Writing / ", "post"),
)

# The languages a corpus can be built in. English is the complete set. Hebrew
# is English with every document that has a Hebrew twin under `docs/he/`
# replaced by it, so a Hebrew question is answered from Hebrew text where it
# exists and nothing Yanir has published is missing from either set.
ENGLISH = "en"
HEBREW = "he"
LANGUAGES = (ENGLISH, HEBREW)

# The machine-readable kind of a document, which is also the name of the
# directory it is read from and of the page that shows it.
PROFILE = "profile"
PROJECT = "project"
WRITING = "writing"

_LABEL_PREFIX = {PROFILE: "Profile / ", PROJECT: "Project / ", WRITING: "Writing / "}
_SUBDIRECTORY = {PROFILE: "profile", PROJECT: "projects", WRITING: "writing"}

# Anything whose label matches no known prefix. A new content directory should
# still be counted rather than silently dropped from the total a visitor reads.
UNKNOWN_KIND = "document"


def kind_of(label: str) -> str:
    """The visitor-facing word for the kind of document a label names."""
    return next(
        (word for prefix, word in SECTION_KINDS if label.startswith(prefix)),
        UNKNOWN_KIND,
    )


@dataclass(frozen=True)
class Section:
    """One document in the corpus, kept whole.

    The corpus used to exist only as one joined string, which was enough while
    every request got all of it. Selecting documents per question needs them
    addressable individually, so the join moved from build time to `Knowledge.text`
    and this is what it joins.
    """

    label: str
    body: str
    # Where the document lives on the site: `source` is profile, project or
    # writing, and `slug` is its file name without the extension. Empty on a
    # section built by hand, which then cannot be named as a source.
    source: str = ""
    slug: str = ""
    title: str = ""
    # One sentence saying what the document is, taken from the document. It is
    # what the model is shown in place of the body when the body is not sent.
    summary: str = ""
    # Publication date of a piece of writing (ISO, so it sorts as text), taken
    # from its `## Date` section. Empty for profile and project documents.
    # Questions like "what did you post lately?" are answered by it.
    date: str = ""

    @property
    def kind(self) -> str:
        return kind_of(self.label)

    @property
    def is_profile(self) -> bool:
        """Yanir's own documents, as opposed to published projects and writing.

        Load-bearing for selection: these are never filtered out. A corpus with
        no profile already fails closed in `_build` for the same reason, and
        narrowing must not reintroduce that hole from the other direction.
        """
        return self.label.startswith("Profile / ")


@dataclass(frozen=True)
class Knowledge:
    """The corpus, plus enough metadata to reason about its cost."""

    sections: Tuple[Section, ...]
    # Documents that exist but whose bodies are not in `sections`. The model is
    # shown one line for each, so it knows what else has been published and can
    # point a visitor to it without being handed text the question did not need.
    listed: Tuple[Section, ...] = ()

    @property
    def text(self) -> str:
        """The corpus as the model sees it.

        Each section is fenced and labelled so the model can attribute a fact to
        a source, and so injected text inside a document cannot pass itself off
        as the end of the corpus. prompt.py wraps the whole block again.
        """
        text = "\n\n".join(f"### {s.label}\n{s.body}" for s in self.sections)
        if self.listed:
            text += f"\n\n### {CATALOGUE_LABEL}\n" + "\n".join(
                f"- {s.label}: {s.summary}" if s.summary else f"- {s.label}"
                for s in self.listed
            )
        return text

    @property
    def sources(self) -> Tuple[str, ...]:
        return tuple(s.label for s in self.sections)

    @property
    def approx_tokens(self) -> int:
        return len(self.text) // CHARS_PER_TOKEN

    @property
    def is_empty(self) -> bool:
        return not any(s.body.strip() for s in self.sections)

    @property
    def source_counts(self) -> Tuple[Tuple[str, int], ...]:
        """How many documents of each kind are here, as (kind, count).

        This describes what was put in front of the model for a request - not
        which documents an answer drew on. Nothing tracks that: no attribution
        step exists, so a list of the documents an answer used would describe
        machinery this project does not have.

        Kinds with no documents are omitted rather than reported as zero.
        """
        counts: Dict[str, int] = {}
        for section in self.sections:
            counts[section.kind] = counts.get(section.kind, 0) + 1

        ordered = [word for _, word in SECTION_KINDS] + [UNKNOWN_KIND]
        return tuple((kind, counts[kind]) for kind in ordered if kind in counts)

    @property
    def documents(self) -> Tuple[Dict[str, str], ...]:
        """The documents here, each as its kind, slug and title.

        The same claim as `source_counts` with names attached: these were placed
        in front of the model. It still says nothing about which of them an
        answer drew on.
        """
        return tuple(
            {"kind": s.source, "slug": s.slug, "title": s.title}
            for s in self.sections
            if s.source and s.slug
        )


# The heading over the one-line entries. prompt.py tells the model what an entry
# under it may and may not be used for.
CATALOGUE_LABEL = "Also published (one line each, full text not included here)"

# A summary is whole sentences from the start of the overview: enough of them
# to pass the minimum, because some overviews open with two words ("This
# site."), and cut at the maximum if one sentence runs long.
MIN_SUMMARY_CHARS = 80
MAX_SUMMARY_CHARS = 220

_SUMMARY_RE = re.compile(r"^## (?:Overview|Summary)[ \t]*\n+(.+?)(?=\n\s*\n|\n#|\Z)", re.MULTILINE | re.DOTALL)
_SENTENCE_END_RE = re.compile(r"(?<=[.!?])\s")


def summary_of(body: str) -> str:
    """The opening of a document's `## Overview` or `## Summary`.

    Taken from the document rather than written beside it, so the line the
    model reads cannot say something the document does not.
    """
    match = _SUMMARY_RE.search(body)
    if not match:
        return ""
    paragraph = " ".join(match.group(1).split())
    summary = ""
    for sentence in _SENTENCE_END_RE.split(paragraph):
        summary = f"{summary} {sentence}".strip()
        if len(summary) >= MIN_SUMMARY_CHARS:
            break
    if len(summary) > MAX_SUMMARY_CHARS:
        summary = summary[:MAX_SUMMARY_CHARS].rsplit(" ", 1)[0] + "..."
    return summary


EMPTY = Knowledge(sections=())

_HEBREW_DIRS = tuple(os.path.join(HEBREW_DIR, name) for name in _SUBDIRECTORY.values())
_CONTENT_DIRS = (PROFILE_DIR, PROJECTS_DIR, WRITING_DIR) + _HEBREW_DIRS
_READABLE_SUFFIXES = (".md", ".pdf")

# A document as it is read from disk: (source, slug, title, body).
_Document = Tuple[str, str, str, str]

_TITLE_RE = re.compile(r"^# (.+)$", re.MULTILINE)

# (fingerprint, {language: knowledge}) of the last successful build. One
# fingerprint covers every language, so editing any file rebuilds all of them.
_cache: Tuple[Tuple, Dict[str, Knowledge]] | None = None


def _fingerprint() -> Tuple:
    """Identity of the content on disk: path, size and mtime of each file.

    Cheap enough to run per request (a handful of stat calls) and precise enough
    that editing a file locally is picked up without a restart.
    """
    entries: List[Tuple[str, int, int]] = []
    for directory in _CONTENT_DIRS:
        if not os.path.isdir(directory):
            continue
        for name in sorted(os.listdir(directory)):
            if not name.endswith(_READABLE_SUFFIXES):
                continue
            path = os.path.join(directory, name)
            try:
                stat = os.stat(path)
            except OSError:
                continue
            entries.append((path, stat.st_size, int(stat.st_mtime_ns)))
    return tuple(entries)


def _read(path: str) -> str:
    return read_pdf_file(path) if path.endswith(".pdf") else read_markdown_file(path)


def _profile_documents() -> List[_Document]:
    """Yanir's own documents."""
    documents: List[_Document] = []
    if not os.path.isdir(PROFILE_DIR):
        logger.warning("Profile directory %s does not exist", PROFILE_DIR)
        return documents

    for name in sorted(os.listdir(PROFILE_DIR)):
        if not name.endswith(_READABLE_SUFFIXES):
            continue
        body = _read(os.path.join(PROFILE_DIR, name)).strip()
        if body:
            slug = os.path.splitext(name)[0]
            documents.append((PROFILE, slug, slug, body))
    return documents


def _project_documents() -> List[_Document]:
    """The project write-ups the site already publishes, reused as chat context.

    The blog and the chat answer from the same files on purpose: two corpora
    would eventually disagree with each other about the same project.
    """
    documents: List[_Document] = []
    for project in get_all_projects():
        body = (project.get("content") or "").strip()
        if body:
            slug = project.get("slug") or ""
            documents.append((PROJECT, slug, project.get("title") or slug or "Untitled", body))
    return documents


def _writing_documents() -> List[_Document]:
    """Published writing, on the same terms as the project write-ups.

    This is what makes the claim on the writing page true rather than
    aspirational: a post is one document, rendered for a reader and given to the
    model, so the two cannot drift. It also means the chat can answer "what have
    you written about evals?" from the actual posts instead of declining.
    """
    documents: List[_Document] = []
    for entry in get_all_writing():
        body = (entry.get("content") or "").strip()
        if body:
            slug = entry.get("slug") or ""
            documents.append((WRITING, slug, entry.get("title") or slug or "Untitled", body))
    return documents


def _in_hebrew(document: _Document) -> _Document:
    """The document's Hebrew twin where one exists, otherwise the document.

    A twin is the file of the same name under `docs/he/`. A profile document
    keeps its file name as its title, as in English; anything else takes the
    twin's own heading.
    """
    source, slug, title, body = document
    path = os.path.join(HEBREW_DIR, _SUBDIRECTORY[source], f"{slug}.md")
    if not os.path.isfile(path):
        return document

    hebrew = read_markdown_file(path).strip()
    if not hebrew:
        return document

    heading = _TITLE_RE.search(hebrew)
    if source != PROFILE and heading:
        title = heading.group(1).strip()
    return (source, slug, title, hebrew)


_DATE_RE = re.compile(r"^## Date[ \t]*\n+(\d{4}-\d{2}-\d{2})", re.MULTILINE)


def _section(document: _Document) -> Section:
    source, slug, title, body = document
    summary = summary_of(body)
    date = ""
    if source == WRITING:
        match = _DATE_RE.search(body)
        date = match.group(1) if match else ""
        # A listed post carries its date, so "what have you written?" can be
        # answered in order and with dates from the one-line entries alone.
        if date and summary:
            summary = f"({date}) {summary}"
    return Section(
        label=f"{_LABEL_PREFIX[source]}{title}",
        body=body,
        source=source,
        slug=slug,
        title=title,
        summary=summary,
        date=date,
    )


def _build() -> Dict[str, Knowledge]:
    """The corpus in every language, from one read of the English files."""
    profile = _profile_documents()
    documents = profile + _project_documents() + _writing_documents()

    if not documents:
        return {language: EMPTY for language in LANGUAGES}

    # Project and writing documents alone are not a profile. Without the profile
    # the chat would report itself ready and answer in Yanir's first person with
    # nothing about Yanir behind it - every question about his background
    # declining, while the site claims an assistant that knows him.
    #
    # "An empty corpus is an error, not a fallback" has to extend to this case,
    # or the fail-closed contract only holds for the one failure where every
    # directory is missing at once.
    if not profile:
        logger.error(
            "Profile directory %s produced no readable sections. Refusing to serve a "
            "corpus of project and writing documents alone.",
            PROFILE_DIR,
        )
        return {language: EMPTY for language in LANGUAGES}

    return {
        ENGLISH: Knowledge(sections=tuple(_section(d) for d in documents)),
        HEBREW: Knowledge(sections=tuple(_section(_in_hebrew(d)) for d in documents)),
    }


def get_knowledge(language: str = ENGLISH) -> Knowledge:
    """Returns the corpus, rebuilding only when the files on disk have changed.

    An unknown language gets the English corpus, which is the complete one.
    """
    global _cache

    if language not in LANGUAGES:
        language = ENGLISH

    fingerprint = _fingerprint()
    if _cache is not None and _cache[0] == fingerprint:
        return _cache[1][language]

    built = _build()
    knowledge = built[ENGLISH]

    # A read failure becomes an empty string, the section is skipped, and the
    # thinner corpus would otherwise be cached under a fingerprint that has not
    # changed - so the lost document is not retried until its size or mtime does,
    # or the process restarts.
    #
    # The fingerprint lists every readable file, so its English entries double
    # as the expected section count. Fewer sections than files means something
    # on disk produced nothing, and the result is used for this request but
    # deliberately not cached, so the next request tries again.
    expected = sum(1 for path, _, _ in fingerprint if not path.startswith(HEBREW_DIR + os.sep))
    if knowledge.sources and len(knowledge.sources) < expected:
        logger.error(
            "Corpus built %d sections from %d files; a source failed to read. "
            "Serving it for this request but not caching, so the next one retries.",
            len(knowledge.sources),
            expected,
        )
        return built[language]

    _cache = (fingerprint, built)

    if knowledge.is_empty:
        logger.error(
            "Knowledge corpus is empty - no readable files in %s. "
            "Chat will decline to answer questions about Yanir.",
            PROFILE_DIR,
        )
    else:
        logger.info(
            "Knowledge corpus loaded: %d sections, ~%d tokens per request (%s)",
            len(knowledge.sources),
            knowledge.approx_tokens,
            ", ".join(knowledge.sources),
        )
        if knowledge.approx_tokens > CONTEXT_REVIEW_TOKENS:
            logger.warning(
                "Corpus is ~%d tokens, past the ~%d review threshold. Every chat "
                "request now pays for all of it; consider selecting sections per "
                "question instead of sending the whole corpus.",
                knowledge.approx_tokens,
                CONTEXT_REVIEW_TOKENS,
            )

    return built[language]


def reading_brief(slug: str, language: str = ENGLISH) -> str:
    """What the model needs to know about the piece a visitor has open.

    Asked from a piece's page, "it", "this post" and "here" mean that piece, and
    the model cannot know that from the question alone. Everything here comes
    from the corpus and the writing index, never from the request, so a visitor
    cannot describe a piece into existence. Empty when the slug names nothing.

    The dated note matters most: a piece can say something that has since
    changed (a waitlist that became an open release), and the model only reads
    the piece itself, so without the note it would repeat the old claim as
    current.
    """
    entry = get_writing_by_slug(slug)
    if not entry or not entry.get("title"):
        return ""

    title = entry["title"]
    published = ", ".join(
        part for part in (entry.get("kind"), entry.get("source"), entry.get("date")) if part
    )
    lines = [
        f'The visitor is reading your piece "{title}" on the site'
        + (f" ({published})." if published else "."),
        f'Its full text is in the PROFILE under "{_LABEL_PREFIX[WRITING]}{title}". '
        '"It", "this", "this post" and "here" mean this piece unless the visitor '
        "names something else.",
    ]

    series = entry.get("series")
    if series:
        series_title = next(
            (s.get("title") for s in get_writing_index()["series"] if s.get("id") == series.get("id")),
            None,
        )
        if series_title:
            lines.append(
                f'It is part {series["position"]} of {series["count"]} in your series "{series_title}".'
            )

    note = entry.get("note")
    if isinstance(note, dict):
        text = note.get(language) or note.get(ENGLISH)
        if text:
            lines.append(
                f"Note added {note.get('date', 'later')}, which outranks the piece where they differ: {text}"
            )

    return "\n".join(lines)
