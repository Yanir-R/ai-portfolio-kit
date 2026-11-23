"""Splits a document into heading-aware chunks, deterministically.

Whole-document selection sends the 2,400-token ReelSensei write-up to answer a
question about its login flow. Chunks let retrieval send the section that
answers, under the same `doc_label` heading the model already sees (plan
sections 2 and 8).

Rules (plan section 2, "Heading-aware chunks"; `CHUNKER_VERSION` changes when
any of them does):

- Split at markdown headings of levels 1-3, never inside a fenced code block.
- Merge consecutive sections until a chunk reaches `MIN_CHUNK_TOKENS`, without
  passing `MAX_CHUNK_TOKENS`; a short trailing chunk joins the one before it
  when they fit together.
- A single section larger than `MAX_CHUNK_TOKENS` is cut at paragraph breaks,
  then line breaks, then (only for one enormous line) at a character count.

Chunks are half-open character spans of `Section.body`, contiguous and in
order, so joining every chunk's text reproduces the body exactly. That is the
property the grouping step and the offset tests rely on: a chunk is always a
slice of what the model would have been given anyway, never a rewrite of it.

Token estimates use `context.CHARS_PER_TOKEN`, the one estimator in the repo.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

from context import CHARS_PER_TOKEN, SECTION_KINDS, Section

CHUNKER_VERSION = "1"

MIN_CHUNK_TOKENS = 200
MAX_CHUNK_TOKENS = 800
MAX_HEADING_LEVEL = 3

UNKNOWN_DOC_KIND = "document"

_HEADING_RE = re.compile(r"^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$")
_FENCE_RE = re.compile(r"^[ \t]{0,3}(```|~~~)")


@dataclass(frozen=True)
class Chunk:
    """One retrievable span of a document (field names follow plan section 5.1).

    `chunk_id` is derived from the label, not the file path: R1 builds chunks
    from the live `Knowledge`, which carries labels only. The offline index in
    R2 has paths and may re-derive ids; nothing persists R1 ids.
    """

    chunk_id: str
    doc_label: str
    doc_kind: str
    doc_title: str
    heading: str
    heading_path: Tuple[str, ...]
    chunk_index: int
    chunk_count: int
    char_start: int
    char_end: int
    token_estimate: int
    content_hash: str
    text: str

    @property
    def context_prefix(self) -> str:
        """`{doc_label} › {heading path}`: indexing aid only, never sent to the model.

        The label (with its kind prefix) is what the R0 selector indexed with
        each document, so a question naming the document or its kind still
        reaches every chunk of it.
        """
        path = [part for part in self.heading_path if part != self.doc_title]
        return " › ".join([self.doc_label, *path])


def doc_kind_of(label: str) -> str:
    """`profile`, `project` or `writing`: the label-prefix family from `SECTION_KINDS`."""
    for prefix, _word in SECTION_KINDS:
        if label.startswith(prefix):
            return prefix.split(" / ", 1)[0].strip().lower()
    return UNKNOWN_DOC_KIND


def doc_title_of(label: str) -> str:
    return label.split(" / ", 1)[1] if " / " in label else label


def _tokens(chars: int) -> int:
    return chars // CHARS_PER_TOKEN


@dataclass(frozen=True)
class _Span:
    start: int
    end: int
    heading: str
    heading_path: Tuple[str, ...]


def _heading_sections(body: str) -> List[_Span]:
    """Spans that each open at a heading (the first may open before any)."""
    starts: List[Tuple[int, str, Tuple[str, ...]]] = [(0, "", ())]
    stack: List[Tuple[int, str]] = []
    in_fence: Optional[str] = None
    offset = 0
    for line in body.splitlines(keepends=True):
        fence = _FENCE_RE.match(line)
        if fence:
            marker = fence.group(1)
            if in_fence is None:
                in_fence = marker
            elif in_fence == marker:
                in_fence = None
        elif in_fence is None:
            heading = _HEADING_RE.match(line.rstrip("\r\n"))
            if heading and len(heading.group(1)) <= MAX_HEADING_LEVEL:
                level, text = len(heading.group(1)), heading.group(2).strip()
                while stack and stack[-1][0] >= level:
                    stack.pop()
                stack.append((level, text))
                path = tuple(part for _, part in stack)
                if offset == 0:
                    starts[0] = (0, text, path)
                else:
                    starts.append((offset, text, path))
        offset += len(line)

    spans = []
    for i, (start, heading, path) in enumerate(starts):
        end = starts[i + 1][0] if i + 1 < len(starts) else len(body)
        if end > start:
            spans.append(_Span(start, end, heading, path))
    return spans


def _cut_points(text: str, separator: str) -> List[int]:
    """Offsets just after each separator: places a span may be cut."""
    points, i = [], text.find(separator)
    while i != -1:
        points.append(i + len(separator))
        i = text.find(separator, i + len(separator))
    return points


def _split_oversized(body: str, span: _Span) -> List[_Span]:
    """Cuts one section larger than the cap into pieces no larger than the cap."""
    max_chars = MAX_CHUNK_TOKENS * CHARS_PER_TOKEN
    pieces: List[_Span] = []
    start = span.start
    while span.end - start > max_chars:
        window = body[start : start + max_chars]
        cut = 0
        for separator in ("\n\n", "\n"):
            points = [p for p in _cut_points(window, separator) if p < len(window)]
            if points:
                cut = points[-1]
                break
        if cut == 0:
            cut = max_chars
        pieces.append(_Span(start, start + cut, span.heading, span.heading_path))
        start += cut
    pieces.append(_Span(start, span.end, span.heading, span.heading_path))
    return pieces


def _merge(spans: List[_Span]) -> List[_Span]:
    """Greedy merge to at least MIN tokens per chunk, never past MAX."""
    merged: List[_Span] = []
    for span in spans:
        if merged:
            current = merged[-1]
            combined = _tokens(span.end - current.start)
            if _tokens(current.end - current.start) < MIN_CHUNK_TOKENS and combined <= MAX_CHUNK_TOKENS:
                merged[-1] = _Span(current.start, span.end, current.heading, current.heading_path)
                continue
        merged.append(span)

    if len(merged) > 1:
        last, previous = merged[-1], merged[-2]
        if (
            _tokens(last.end - last.start) < MIN_CHUNK_TOKENS
            and _tokens(last.end - previous.start) <= MAX_CHUNK_TOKENS
        ):
            merged[-2:] = [_Span(previous.start, last.end, previous.heading, previous.heading_path)]
    return merged


def _chunk_id(doc_label: str, heading_path: Tuple[str, ...], index: int) -> str:
    key = f"{doc_label}\0{chr(0x1F).join(heading_path)}\0{index}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def chunk_section(section: Section) -> Tuple[Chunk, ...]:
    """Every chunk of one document, in order. Empty bodies have none."""
    body = section.body
    if not body:
        return ()

    spans: List[_Span] = []
    for span in _heading_sections(body):
        spans.extend(_split_oversized(body, span))
    spans = _merge(spans)

    kind, title = doc_kind_of(section.label), doc_title_of(section.label)
    count = len(spans)
    return tuple(
        Chunk(
            chunk_id=_chunk_id(section.label, span.heading_path, index),
            doc_label=section.label,
            doc_kind=kind,
            doc_title=title,
            heading=span.heading,
            heading_path=span.heading_path,
            chunk_index=index,
            chunk_count=count,
            char_start=span.start,
            char_end=span.end,
            token_estimate=_tokens(span.end - span.start),
            content_hash=hashlib.sha256(body[span.start : span.end].encode("utf-8")).hexdigest(),
            text=body[span.start : span.end],
        )
        for index, span in enumerate(spans)
    )
