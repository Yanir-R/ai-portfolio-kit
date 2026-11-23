"""Chunk-level retrieval: lexical (R1, `RETRIEVAL_MODE=lexical`) and hybrid (R2, `=hybrid`).

`selection.select` stays the default and the R0 comparison baseline. This
module adds a second path and a dispatcher (`select`) that `main.py` calls; with
`RETRIEVAL_MODE` unset, the dispatcher hands every request to
`selection.select` exactly as before.

What changes on the lexical path (plan sections 2, 6, 6.1 and 8):

- **Unit: chunks, not documents.** Project and writing documents are split by
  `chunking.chunk_section`; profile documents are the always-sent core and are
  never scored.
- **Score: Okapi BM25** over chunk text plus its `{doc_label} › {headings}`
  prefix, replacing the set-based log(N/df) overlap. Term frequency saturates
  (`BM25_K1`) and long chunks are length-normalised (`BM25_B`).
- **One tokenizer** (`lexical.analyze` / `lexical.index_terms`) for the
  question and the chunks: English stemming from `selection`, Hebrew
  normalisation, and a Hebrew trigram fallback against the index vocabulary.
- **Gate: share of the question.** A chunk is a candidate only if it accounts
  for at least `MIN_COVERAGE` of the question's weight - the same 25% share
  `selection.QUERY_COVERAGE` uses. Unlike the R0 selector, words the corpus
  does not know count against the share instead of being ignored, and there is
  no "keep the best match anyway" rule: a weak leftover word no longer drags
  in a post (R0 `no_word_match` desired-outcome rate 0).
- **Miss path: CORE_ONLY. Decided by Yanir 2026-11-23.** When nothing passes
  the gate, the request gets `Profile / about-me` and `Profile / resume` only.
  The whole corpus is never the fallback; UNFOCUSED is not produced here.
- **Budget and grouping.** Candidates are taken in rank order up to
  `RETRIEVAL_TOKEN_BUDGET` / `TOP_K_MAX`, regrouped under their original
  `doc_label` in corpus order and `chunk_index` order, with `GAP_MARKER`
  between non-adjacent spans. Documents of at most `WHOLE_DOC_TOKENS` go whole.
- **Failure: CORE_ONLY with the reason logged.** Any exception inside
  retrieval degrades to the core deterministically; it never raises into the
  request and never sends everything.

How a question word is weighed, and why:

- in the chunk index: its BM25 IDF (best of its variants);
- not in any chunk but in the profile core: weight 0 - the core is always
  sent, so the question is already covered there ("What did you do at
  Moonsite?" is a profile question, not a miss);
- in a script the chunk index has no text in at all (Hebrew today): weight 0 -
  a Hebrew word cannot be judged against English text, so it neither helps nor
  vetoes a Latin name in the same question ("תספר על ReelSensei");
- unknown in a script the index does have: the weight of the rarest known
  term, so "quantum annealing" against one stray English match stays a miss.

**Hybrid mode (plan phase R2, `RETRIEVAL_MODE=hybrid`).** The lexical leg
above runs unchanged. A dense leg adds the cosine between the question's
embedding (`embedding.QueryEmbedder`: one reused client, in-memory LRU,
800 ms timeout) and each chunk's vector from the committed index
(`vector_index`, validated against the live docs). A chunk qualifies if the
lexical leg kept it or its cosine is at least `MIN_COSINE`; qualified chunks
are ordered by Reciprocal Rank Fusion of the two ranks (`RRF_K`), then go
through the same budget, grouping and core-only miss path. The dense leg is
skipped - and the request is exactly the lexical result - when the index is
missing, stale or invalid, or the embedding call times out or fails (plan
section 6, "Fallback reconciliation"). The greeting / no-terms path never
calls the embedder.

**Observability.** Each call logs one `Retrieval: {json}` line: mode, outcome,
reason, documents and chunk ids sent with BM25 and coverage scores, counts of
question words by class, timings and token estimates. Never the question,
never its words or terms - only counts (`main.py` logs request shape only, and
this keeps that promise).
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import time
from dataclasses import asdict, dataclass
from typing import Callable, Dict, FrozenSet, Iterable, List, Optional, Sequence, Set, Tuple

import embedding
import selection
import vector_index
from chunking import Chunk, chunk_section
from context import CHARS_PER_TOKEN, Knowledge, Section
from lexical import HEBREW, Token, analyze, char_trigrams, index_terms, script_of, trigram_similarity
from selection import CONVERSATIONAL, FRAMING_TURNS, NARROWED, NO_CORPUS, QUERY_COVERAGE, Selection

logger = logging.getLogger(__name__)

# The retrieval-miss outcome (plan section 6). Serialised into the chat trace
# as `context_outcome`; the frontend type lists it.
CORE_ONLY = "core_only"

MODE_ENV = "RETRIEVAL_MODE"
MODE_SELECTION = "selection"
MODE_LEXICAL = "lexical"
MODE_HYBRID = "hybrid"
MODES = (MODE_SELECTION, MODE_LEXICAL, MODE_HYBRID)
# Today's behaviour stays the default until R3 flips it (plan section 11).
DEFAULT_MODE = MODE_SELECTION

# Standard Okapi BM25 parameters; nothing was fitted to the eval set.
BM25_K1 = 1.2
BM25_B = 0.75

# Share of the question's weight a chunk must account for. Reused from the
# R0 selector so the gate is the one already argued for in selection.py.
MIN_COVERAGE = QUERY_COVERAGE

# A document's share must also be at least this fraction of the best
# document's share (see `_retrieve`).
MIN_SHARE_OF_BEST = 0.5

# Plan section 6: about 3k tokens of project and writing text, at most 12
# chunks, on top of the ~1.6k-token core.
RETRIEVAL_TOKEN_BUDGET = 3_000
TOP_K_MAX = 12

# Plan section 8.6: a short document is sent whole when any chunk of it wins,
# so a skipped paragraph cannot hide the one fact a short post holds.
WHOLE_DOC_TOKENS = 500

# Dice similarity of character trigrams for the Hebrew fallback. Not tunable
# on the current eval set (the corpus has no Hebrew); set conservatively so a
# fuzzy match needs most of a word in common.
TRIGRAM_MIN_SIMILARITY = 0.6

# Reciprocal Rank Fusion constant. PROVISIONAL: the plan asks for k in [2, 10]
# tuned on the tune half (section 6, [S3]); with no real embeddings yet it
# sits mid-range. `measure_r2.py --tune` sweeps it once a real index exists.
RRF_K = 5

# Cosine a chunk needs to qualify through the dense leg alone. PROVISIONAL and
# uncalibrated: the plan calibrates it on the eval set's off-topic questions
# with real embeddings (section 6, "Min-score gate"); nothing was fitted.
MIN_COSINE = 0.60

# Marks skipped chunks between two sent spans of one document, so the model
# is not invited to read non-adjacent paragraphs as continuous text.
GAP_MARKER = "[…]"

# Why the outcome is what it is. Stable strings: they are logged and tested.
REASON_PASSED_GATE = "passed_gate"
REASON_NO_CORPUS = "no_corpus"
REASON_NO_TOPICAL_TERMS = "no_topical_terms"
REASON_NO_RETRIEVABLE_CHUNKS = "no_retrievable_chunks"
REASON_NO_TERM_IN_INDEX = "no_term_in_index"
REASON_NO_DISTINGUISHING_TERMS = "no_distinguishing_terms"
REASON_BELOW_COVERAGE_GATE = "below_coverage_gate"
REASON_RETRIEVAL_ERROR = "retrieval_error"

# What the dense leg did on a hybrid request. Stable strings.
DENSE_OK = "ok"
DENSE_INDEX_UNAVAILABLE = "index_unavailable"
DENSE_MODEL_MISMATCH = "model_mismatch"
DENSE_ERROR = "error"
DENSE_NOT_RUN = "not_run"
# Embedder outcomes (timeout, error, no_client, empty_query) are passed through
# from `embedding.QueryEmbedding.status`.

# How a question word was resolved against the index.
WORD_MATCHED = "matched"
WORD_TRIGRAM = "trigram"
WORD_CORE = "core"
WORD_OTHER_SCRIPT = "other_script"
WORD_UNKNOWN = "unknown"


# --- index ---------------------------------------------------------------------


@dataclass(frozen=True)
class _Index:
    """BM25 statistics for the retrievable chunks, built once per corpus."""

    chunks: Tuple[Chunk, ...]
    doc_chunks: Dict[str, Tuple[Chunk, ...]]
    doc_order: Dict[str, int]
    doc_tokens: Dict[str, int]
    postings: Dict[str, Tuple[Tuple[int, int], ...]]
    lengths: Tuple[int, ...]
    average_length: float
    idf: Dict[str, float]
    core_vocabulary: FrozenSet[str]
    doc_vocabulary: Dict[str, FrozenSet[str]]
    doc_weights: Dict[str, float]
    scripts: FrozenSet[str]
    hebrew_trigrams: Tuple[Tuple[str, FrozenSet[str]], ...]
    unknown_weight: float


def _bm25_idf(total: int, document_frequency: int) -> float:
    """Okapi IDF with the +1 inside the log, so it is never negative."""
    return math.log(1.0 + (total - document_frequency + 0.5) / (document_frequency + 0.5))


def _build_index(knowledge: Knowledge) -> _Index:
    chunks: List[Chunk] = []
    doc_chunks: Dict[str, Tuple[Chunk, ...]] = {}
    core_vocabulary: Set[str] = set()
    document_frequency: Dict[str, int] = {}
    for section in knowledge.sections:
        vocabulary = set(index_terms(f"{section.label}\n{section.body}"))
        for term in vocabulary:
            document_frequency[term] = document_frequency.get(term, 0) + 1
        if section.is_profile:
            core_vocabulary.update(vocabulary)
            continue
        pieces = chunk_section(section)
        doc_chunks[section.label] = pieces
        chunks.extend(pieces)
    total_docs = len(knowledge.sections)

    frequencies: List[Dict[str, int]] = []
    for chunk in chunks:
        counts: Dict[str, int] = {}
        for term in index_terms(f"{chunk.context_prefix}\n{chunk.text}"):
            counts[term] = counts.get(term, 0) + 1
        frequencies.append(counts)

    postings: Dict[str, List[Tuple[int, int]]] = {}
    for position, counts in enumerate(frequencies):
        for term, count in counts.items():
            postings.setdefault(term, []).append((position, count))

    total = len(chunks)
    idf = {term: _bm25_idf(total, len(entries)) for term, entries in postings.items()}
    lengths = tuple(sum(counts.values()) for counts in frequencies)
    doc_vocabulary: Dict[str, Set[str]] = {}
    for chunk, counts in zip(chunks, frequencies):
        doc_vocabulary.setdefault(chunk.doc_label, set()).update(counts)
    return _Index(
        chunks=tuple(chunks),
        doc_chunks=doc_chunks,
        doc_order={section.label: i for i, section in enumerate(knowledge.sections)},
        doc_tokens={s.label: len(s.body) // CHARS_PER_TOKEN for s in knowledge.sections},
        postings={term: tuple(entries) for term, entries in postings.items()},
        lengths=lengths,
        average_length=(sum(lengths) / total) if total else 0.0,
        idf=idf,
        core_vocabulary=frozenset(core_vocabulary),
        doc_vocabulary={label: frozenset(terms) for label, terms in doc_vocabulary.items()},
        # The R0 selector's measure, over whole documents (profile included):
        # zero for a word in every document, largest for a word in one.
        doc_weights={term: math.log(total_docs / df) for term, df in document_frequency.items()},
        scripts=frozenset(script_of(term) for term in idf),
        hebrew_trigrams=tuple(
            (term, char_trigrams(term)) for term in sorted(idf) if script_of(term) == HEBREW
        ),
        # A word in no document is rarer than one in a single document: the
        # same log(N/df) with df smoothed to one half.
        unknown_weight=math.log(2 * total_docs) if total_docs else 0.0,
    )


def _corpus_key(knowledge: Knowledge) -> str:
    """Content identity of the corpus: labels and bodies, not object identity."""
    digest = hashlib.sha256()
    for section in knowledge.sections:
        digest.update(section.label.encode("utf-8"))
        digest.update(b"\0")
        digest.update(section.body.encode("utf-8"))
        digest.update(b"\x1e")
    return digest.hexdigest()


# (corpus key, index) for the corpus this was last built from.
_index_cache: Tuple[str, _Index] | None = None


def _index_for(knowledge: Knowledge) -> _Index:
    global _index_cache
    key = _corpus_key(knowledge)
    if _index_cache is not None and _index_cache[0] == key:
        return _index_cache[1]
    index = _build_index(knowledge)
    _index_cache = (key, index)
    logger.info(
        "Retrieval index built: %d chunks from %d documents, %d terms",
        len(index.chunks),
        len(index.doc_chunks),
        len(index.idf),
    )
    return index


def _reset_cache() -> None:
    """Drops the chunk index and the aligned vectors. For tests that rebuild the corpus."""
    global _index_cache, _vector_cache
    _index_cache = None
    _vector_cache = None


# --- structured result ---------------------------------------------------------


@dataclass(frozen=True)
class ScoredChunk:
    """A candidate chunk: its BM25 score and its document's share of the question."""

    chunk: Chunk
    bm25: float
    coverage: float
    # Hybrid mode only: cosine to the question and the fused RRF score.
    cosine: Optional[float] = None
    fused: Optional[float] = None


@dataclass(frozen=True)
class DenseReport:
    """What the dense leg did on one hybrid request. Counts and codes only."""

    status: str
    index_status: str
    index_reason: str
    cache: str = embedding.CACHE_NONE
    embed_ms: float = 0.0
    model: Optional[str] = None
    qualified: int = 0
    error: Optional[str] = None

    def log_record(self) -> Dict[str, object]:
        record = asdict(self)
        record["embed_ms"] = round(self.embed_ms, 3)
        if self.error is None:
            record.pop("error")
        return record


@dataclass(frozen=True)
class WordCounts:
    """Question words by how they resolved. Counts only: no words."""

    total: int = 0
    matched: int = 0
    trigram: int = 0
    core: int = 0
    other_script: int = 0
    unknown: int = 0


@dataclass(frozen=True)
class Retrieval:
    """What the lexical retriever decided, and everything needed to audit it.

    `selection` is what the request uses (the same `Selection` type the R0
    selector returns, so `main.py` and the trace need no second shape).
    """

    selection: Selection
    mode: str
    reason: str
    candidates: Tuple[ScoredChunk, ...]
    sent: Tuple[ScoredChunk, ...]
    words: WordCounts
    framed_from_history: bool
    retrieved_tokens: int
    timings_ms: Dict[str, float]
    error: Optional[str] = None
    dense: Optional[DenseReport] = None

    @property
    def outcome(self) -> str:
        return self.selection.outcome

    @property
    def token_estimate(self) -> int:
        """`Knowledge.approx_tokens` of the PROFILE this request sends."""
        return self.selection.knowledge.approx_tokens

    def log_record(self) -> Dict[str, object]:
        """The audit line. Labels and ids of committed docs only; no visitor text."""
        record: Dict[str, object] = {
            "mode": self.mode,
            "outcome": self.outcome,
            "reason": self.reason,
            "available": self.selection.available,
            "docs_sent": list(self.selection.knowledge.sources),
            "chunks_sent": [_hit_record(hit) for hit in self.sent],
            "candidates": len(self.candidates),
            "words": asdict(self.words),
            "framed_from_history": self.framed_from_history,
            "token_estimate": self.token_estimate,
            "retrieved_tokens": self.retrieved_tokens,
            "timings_ms": {name: round(value, 3) for name, value in self.timings_ms.items()},
        }
        if self.error:
            record["error"] = self.error
        if self.dense is not None:
            record["dense"] = self.dense.log_record()
        return record


def _hit_record(hit: ScoredChunk) -> Dict[str, object]:
    record: Dict[str, object] = {
        "chunk_id": hit.chunk.chunk_id[:16],
        "doc_label": hit.chunk.doc_label,
        "chunk_index": hit.chunk.chunk_index,
        "bm25": round(hit.bm25, 4),
        "coverage": round(hit.coverage, 4),
    }
    if hit.cosine is not None:
        record["cosine"] = round(hit.cosine, 4)
    if hit.fused is not None:
        record["rrf"] = round(hit.fused, 6)
    return record


# --- query ---------------------------------------------------------------------


@dataclass(frozen=True)
class _Word:
    """One distinct question word, resolved against the index.

    `alternatives` are the chunk-index terms it may match, each with a match
    weight (1.0 exact, the trigram similarity for a fuzzy match). `weight` is
    its share of the question for the coverage gate (`log(N/df)` over whole
    documents; see the module docstring for the classes).
    """

    alternatives: Tuple[Tuple[str, float], ...]
    status: str
    weight: float


def _trigram_match(token: Token, index: _Index) -> Optional[Tuple[str, float]]:
    """Closest Hebrew index term by trigram Dice, if it clears the bar.

    Ties keep the first term in sorted order, so the choice is deterministic.
    """
    grams = [char_trigrams(variant) for variant in token.variants]
    best: Optional[Tuple[str, float]] = None
    for term, term_grams in index.hebrew_trigrams:
        similarity = max(trigram_similarity(g, term_grams) for g in grams)
        if similarity >= TRIGRAM_MIN_SIMILARITY and (best is None or similarity > best[1]):
            best = (term, similarity)
    return best


def _resolve(token: Token, index: _Index) -> _Word:
    exact = tuple((variant, 1.0) for variant in token.variants if variant in index.idf)
    if exact:
        return _Word(exact, WORD_MATCHED, max(index.doc_weights[t] for t, _ in exact))
    in_core = [variant for variant in token.variants if variant in index.core_vocabulary]
    if in_core:
        # Asked, and answered by the always-sent core: it counts toward the
        # question, so a profile question does not narrow to a stray post.
        return _Word((), WORD_CORE, max(index.doc_weights[t] for t in in_core))
    if token.script not in index.scripts:
        return _Word((), WORD_OTHER_SCRIPT, 0.0)
    if token.script == HEBREW:
        fuzzy = _trigram_match(token, index)
        if fuzzy is not None:
            term, similarity = fuzzy
            return _Word((fuzzy,), WORD_TRIGRAM, similarity * index.doc_weights[term])
    return _Word((), WORD_UNKNOWN, index.unknown_weight)


def _topical_tokens(text: str) -> List[Token]:
    """Distinct topic-bearing tokens, first occurrence order."""
    seen: Set[Tuple[str, ...]] = set()
    tokens: List[Token] = []
    for token in analyze(text):
        if token.variants and token.variants not in seen:
            seen.add(token.variants)
            tokens.append(token)
    return tokens


def _bm25(words: Sequence[_Word], index: _Index) -> List[float]:
    """BM25 per chunk; each word counts once, by its best-scoring variant."""
    scores = [0.0] * len(index.chunks)
    for word in words:
        best: Dict[int, float] = {}
        for term, weight in word.alternatives:
            term_idf = index.idf[term]
            for position, frequency in index.postings[term]:
                norm = 1.0 - BM25_B + BM25_B * index.lengths[position] / index.average_length
                value = weight * term_idf * frequency * (BM25_K1 + 1.0) / (frequency + BM25_K1 * norm)
                if value > best.get(position, 0.0):
                    best[position] = value
        for position, value in best.items():
            scores[position] += value
    return scores


def _coverage(words: Sequence[_Word], index: _Index, asked: float) -> Dict[str, float]:
    """Share of the question's weight each retrievable document accounts for.

    Measured per document, not per chunk: a question naming a project and one
    of its features is about that document even when the two words sit in
    different sections. Chunk ranking (BM25) then decides which sections go.
    """
    shares: Dict[str, float] = {}
    for label, vocabulary in index.doc_vocabulary.items():
        matched = 0.0
        for word in words:
            present = [w * index.doc_weights[t] for t, w in word.alternatives if t in vocabulary]
            if present:
                matched += max(present)
        shares[label] = matched / asked
    return shares


def _within_budget(ranked: Sequence[ScoredChunk], index: _Index) -> Tuple[Tuple[ScoredChunk, ...], int]:
    """Rank order until the token budget or TOP_K_MAX; the top chunk always goes."""
    sent: List[ScoredChunk] = []
    whole_docs: Set[str] = set()
    spent = 0
    for hit in ranked:
        if len(sent) >= TOP_K_MAX:
            break
        label = hit.chunk.doc_label
        if label in whole_docs:
            sent.append(hit)
            continue
        doc_tokens = index.doc_tokens[label]
        cost = doc_tokens if doc_tokens <= WHOLE_DOC_TOKENS else hit.chunk.token_estimate
        if sent and spent + cost > RETRIEVAL_TOKEN_BUDGET:
            break
        spent += cost
        sent.append(hit)
        if doc_tokens <= WHOLE_DOC_TOKENS:
            whole_docs.add(label)
    return tuple(sent), spent


def _stitch(section: Section, chunks: Sequence[Chunk], indexes: Iterable[int]) -> str:
    """Sent chunks of one document in order; GAP_MARKER where chunks were skipped."""
    ordered = sorted(set(indexes))
    groups: List[List[int]] = []
    for i in ordered:
        if groups and i == groups[-1][-1] + 1:
            groups[-1].append(i)
        else:
            groups.append([i])

    parts: List[str] = []
    if ordered[0] > 0:
        parts.append(GAP_MARKER)
    for group in groups:
        if parts and parts[-1] != GAP_MARKER:
            parts.append(GAP_MARKER)
        start, end = chunks[group[0]].char_start, chunks[group[-1]].char_end
        parts.append(section.body[start:end].strip())
    if ordered[-1] < len(chunks) - 1:
        parts.append(GAP_MARKER)
    return "\n\n".join(parts)


def _assemble(knowledge: Knowledge, sent: Sequence[ScoredChunk], index: _Index) -> Knowledge:
    """Core plus sent chunks, regrouped under original labels in corpus order."""
    by_doc: Dict[str, Set[int]] = {}
    for hit in sent:
        by_doc.setdefault(hit.chunk.doc_label, set()).add(hit.chunk.chunk_index)

    sections: List[Section] = []
    for section in knowledge.sections:
        if section.is_profile:
            sections.append(section)
            continue
        chosen = by_doc.get(section.label)
        if not chosen:
            continue
        if index.doc_tokens[section.label] <= WHOLE_DOC_TOKENS or len(chosen) == len(
            index.doc_chunks[section.label]
        ):
            sections.append(section)
        else:
            body = _stitch(section, index.doc_chunks[section.label], chosen)
            sections.append(Section(label=section.label, body=body))
    return Knowledge(sections=tuple(sections))


def _core(knowledge: Knowledge) -> Knowledge:
    """The always-sent profile documents. `context._build` guarantees they exist."""
    return Knowledge(sections=tuple(s for s in knowledge.sections if s.is_profile))


# --- dense leg (hybrid mode) ----------------------------------------------------


@dataclass(frozen=True)
class DenseResources:
    """Where hybrid mode gets vectors from. Injected in tests and the eval harness.

    `loader(knowledge)` returns a `vector_index.IndexLoad`; `embedder` has
    `.embed(text) -> embedding.QueryEmbedding`, `.model` and `.dimensions`.
    """

    loader: Callable[[Knowledge], vector_index.IndexLoad]
    embedder: object


def _default_dense() -> DenseResources:
    """Production: the committed index and the process-wide embedder."""
    return DenseResources(loader=vector_index.load_runtime_index, embedder=embedding.shared_embedder())


# (index, loader, load result, vectors aligned to index.chunks or None).
_vector_cache: Optional[Tuple[_Index, object, vector_index.IndexLoad, Optional[Tuple[embedding.Vector, ...]]]] = None


def _aligned_vectors(
    knowledge: Knowledge, index: _Index, resources: DenseResources
) -> Tuple[vector_index.IndexLoad, Optional[Tuple[embedding.Vector, ...]]]:
    """Index vectors in `index.chunks` order, loaded and validated once per corpus.

    A load that is not OK is logged once (not per request) and cached, so a
    stale index costs one ERROR line and no repeated file reads.
    """
    global _vector_cache
    if _vector_cache is not None and _vector_cache[0] is index and _vector_cache[1] is resources.loader:
        return _vector_cache[2], _vector_cache[3]
    load = resources.loader(knowledge)
    vectors: Optional[Tuple[embedding.Vector, ...]] = None
    if load.ok:
        assert load.index is not None
        try:
            vectors = tuple(load.index.vectors[chunk.chunk_id] for chunk in index.chunks)
        except KeyError:
            load = vector_index.IndexLoad(vector_index.LOAD_STALE, "chunk_set_differs_from_live_chunker")
    if vectors is None:
        log = logger.warning if load.status == vector_index.LOAD_MISSING else logger.error
        log("Vector index not served (%s: %s); hybrid mode ranks with BM25 only", load.status, load.reason)
    _vector_cache = (index, resources.loader, load, vectors)
    return load, vectors


def _dense_leg(
    text: str, knowledge: Knowledge, index: _Index, resources: Optional[DenseResources]
) -> Tuple[DenseReport, Optional[List[float]]]:
    """Cosine per chunk, or a report of why the leg was skipped. Never raises."""
    load = vector_index.IndexLoad(DENSE_NOT_RUN, "not_loaded")
    try:
        resources = resources or _default_dense()
        load, vectors = _aligned_vectors(knowledge, index, resources)
        if vectors is None or load.index is None:
            return DenseReport(DENSE_INDEX_UNAVAILABLE, load.status, load.reason), None
        embedder = resources.embedder
        if (embedder.model, embedder.dimensions) != (load.index.model, load.index.dimensions):
            return DenseReport(DENSE_MODEL_MISMATCH, load.status, load.reason, model=embedder.model), None
        query = embedder.embed(text)
        if not query.ok:
            return (
                DenseReport(query.status, load.status, load.reason, query.cache, query.elapsed_ms, embedder.model,
                            error=query.error),
                None,
            )
        q = query.vector
        cosines = [sum(a * b for a, b in zip(q, vector)) for vector in vectors]
        qualified = sum(value >= MIN_COSINE for value in cosines)
        return (
            DenseReport(DENSE_OK, load.status, load.reason, query.cache, query.elapsed_ms, embedder.model, qualified),
            cosines,
        )
    except Exception as exc:  # the dense leg is optional; BM25 carries the request
        return DenseReport(DENSE_ERROR, load.status, load.reason, error=f"{type(exc).__name__} at {embedding.where(exc)}"), None


def _fuse(
    lexical: Sequence[ScoredChunk],
    cosines: Sequence[float],
    bm25: Optional[Sequence[float]],
    shares: Dict[str, float],
    index: _Index,
) -> Tuple[ScoredChunk, ...]:
    """Reciprocal Rank Fusion of the lexical candidates and the dense qualifiers.

    Ranks are 1-based within each leg's qualified list; a chunk in only one
    list gets only that leg's term. RRF uses ranks, so BM25 and cosine never
    need a common scale (plan section 2.5). Ties: corpus order, chunk order.
    """
    def order(position: int) -> Tuple[int, int]:
        chunk = index.chunks[position]
        return index.doc_order[chunk.doc_label], chunk.chunk_index

    position_of = {chunk.chunk_id: i for i, chunk in enumerate(index.chunks)}
    lexical_rank = {hit.chunk.chunk_id: rank for rank, hit in enumerate(lexical, 1)}
    dense_order = sorted(
        (i for i, value in enumerate(cosines) if value >= MIN_COSINE),
        key=lambda i: (-cosines[i], *order(i)),
    )
    dense_rank = {index.chunks[i].chunk_id: rank for rank, i in enumerate(dense_order, 1)}

    fused: List[ScoredChunk] = []
    for chunk_id in set(lexical_rank) | set(dense_rank):
        i = position_of[chunk_id]
        chunk = index.chunks[i]
        score = sum(1.0 / (RRF_K + rank) for rank in (lexical_rank.get(chunk_id), dense_rank.get(chunk_id)) if rank)
        fused.append(
            ScoredChunk(
                chunk=chunk,
                bm25=bm25[i] if bm25 is not None else 0.0,
                coverage=shares.get(chunk.doc_label, 0.0),
                cosine=cosines[i],
                fused=score,
            )
        )
    fused.sort(key=lambda hit: (-hit.fused, *order(position_of[hit.chunk.chunk_id])))
    return tuple(fused)


# --- entry points ----------------------------------------------------------------


def _elapsed_ms(since: float) -> float:
    return (time.perf_counter() - since) * 1000.0


@dataclass(frozen=True)
class _Lexical:
    """The R1 lexical leg's verdict: candidates in BM25 order, or why there are none."""

    candidates: Tuple[ScoredChunk, ...]
    reason: str
    bm25: Optional[List[float]] = None
    shares: Optional[Dict[str, float]] = None


def _lexical_leg(words: Sequence[_Word], index: _Index) -> _Lexical:
    """R1 unchanged: the coverage gate, then BM25 order inside the passing documents."""
    if not index.chunks:
        return _Lexical((), REASON_NO_RETRIEVABLE_CHUNKS)
    if not any(word.alternatives for word in words):
        return _Lexical((), REASON_NO_TERM_IN_INDEX)

    asked = sum(word.weight for word in words)
    if asked <= 0.0:
        # Every word is in every document, or in a script the index cannot
        # judge: no basis to choose a document, and the core is the answer.
        return _Lexical((), REASON_NO_DISTINGUISHING_TERMS)
    shares = _coverage(words, index, asked)
    # A document must also hold its own against the best match: a stray
    # shared word should not ride along beside a document that answers most
    # of the question. Fitted on the tune half only (docs/plans/RAG-R1-RESULTS.md).
    bar = max(MIN_COVERAGE, MIN_SHARE_OF_BEST * max(shares.values(), default=0.0))
    bm25 = _bm25(words, index)
    candidates = tuple(
        sorted(
            (
                ScoredChunk(chunk=chunk, bm25=bm25[i], coverage=shares[chunk.doc_label])
                for i, chunk in enumerate(index.chunks)
                if bm25[i] > 0.0 and shares[chunk.doc_label] >= bar
            ),
            # Deterministic order: score, then corpus order, then chunk order.
            key=lambda hit: (-hit.bm25, index.doc_order[hit.chunk.doc_label], hit.chunk.chunk_index),
        )
    )
    return _Lexical(candidates, REASON_PASSED_GATE if candidates else REASON_BELOW_COVERAGE_GATE, bm25, shares)


def _retrieve(
    question: str,
    knowledge: Knowledge,
    history: Optional[Iterable[str]],
    started: float,
    mode: str = MODE_LEXICAL,
    dense: Optional[DenseResources] = None,
) -> Retrieval:
    timings: Dict[str, float] = {}

    def result(outcome: str, reason: str, chosen: Knowledge, **extra) -> Retrieval:
        timings["total"] = _elapsed_ms(started)
        available = len(knowledge.sections) if outcome != NO_CORPUS else 0
        return Retrieval(
            selection=Selection(knowledge=chosen, outcome=outcome, available=available),
            mode=mode,
            reason=reason,
            candidates=extra.get("candidates", ()),
            sent=extra.get("sent", ()),
            words=extra.get("words", WordCounts()),
            framed_from_history=extra.get("framed", False),
            retrieved_tokens=extra.get("retrieved_tokens", 0),
            timings_ms=timings,
            dense=extra.get("dense"),
        )

    if knowledge.is_empty:
        return result(NO_CORPUS, REASON_NO_CORPUS, knowledge)

    # Same framing rule as the R0 selector: a message with nothing topical in
    # it is read with the recent turns the model is replayed; with no
    # conversation behind it, it is conversational.
    mark = time.perf_counter()
    query_text = question
    tokens = _topical_tokens(question)
    framed = False
    if not tokens:
        query_text = "\n".join(list(history or [])[-FRAMING_TURNS:])
        tokens = _topical_tokens(query_text)
        framed = bool(tokens)
    timings["analyze"] = _elapsed_ms(mark)
    if not tokens:
        return result(CONVERSATIONAL, REASON_NO_TOPICAL_TERMS, _core(knowledge))

    mark = time.perf_counter()
    index = _index_for(knowledge)
    timings["index"] = _elapsed_ms(mark)

    mark = time.perf_counter()
    words = [_resolve(token, index) for token in tokens]
    counts = WordCounts(
        total=len(words),
        matched=sum(w.status == WORD_MATCHED for w in words),
        trigram=sum(w.status == WORD_TRIGRAM for w in words),
        core=sum(w.status == WORD_CORE for w in words),
        other_script=sum(w.status == WORD_OTHER_SCRIPT for w in words),
        unknown=sum(w.status == WORD_UNKNOWN for w in words),
    )
    lexical = _lexical_leg(words, index)
    timings["score"] = _elapsed_ms(mark)

    candidates = lexical.candidates
    report: Optional[DenseReport] = None
    if mode == MODE_HYBRID:
        if index.chunks:
            mark = time.perf_counter()
            report, cosines = _dense_leg(query_text, knowledge, index, dense)
            if cosines is not None:
                candidates = _fuse(lexical.candidates, cosines, lexical.bm25, lexical.shares or {}, index)
            timings["dense"] = _elapsed_ms(mark)
        else:
            report = DenseReport(DENSE_NOT_RUN, DENSE_NOT_RUN, REASON_NO_RETRIEVABLE_CHUNKS)

    if not candidates:
        return result(CORE_ONLY, lexical.reason, _core(knowledge), words=counts, framed=framed, dense=report)

    mark = time.perf_counter()
    sent, spent = _within_budget(candidates, index)
    chosen = _assemble(knowledge, sent, index)
    timings["assemble"] = _elapsed_ms(mark)
    return result(
        NARROWED,
        REASON_PASSED_GATE,
        chosen,
        candidates=candidates,
        sent=sent,
        words=counts,
        framed=framed,
        retrieved_tokens=spent,
        dense=report,
    )


def _failed(knowledge: Knowledge, exc: BaseException, started: float, mode: str = MODE_LEXICAL) -> Retrieval:
    """Deterministic degradation: the core, the reason, and where it broke.

    The exception message is deliberately not logged - it could carry a
    visitor's word (a KeyError on a term, say). Type and location are enough
    to find the bug.
    """
    logger.error(
        "Retrieval failed (%s at %s); serving the core only",
        type(exc).__name__,
        embedding.where(exc),
    )
    try:
        core = _core(knowledge)
        available = len(knowledge.sections)
    except Exception:  # a corpus too broken to filter still must not raise here
        core, available = Knowledge(sections=()), 0
    return Retrieval(
        selection=Selection(knowledge=core, outcome=CORE_ONLY, available=available),
        mode=mode,
        reason=REASON_RETRIEVAL_ERROR,
        candidates=(),
        sent=(),
        words=WordCounts(),
        framed_from_history=False,
        retrieved_tokens=0,
        timings_ms={"total": _elapsed_ms(started)},
        error=type(exc).__name__,
    )


def retrieve(
    question: str,
    knowledge: Knowledge,
    history: Optional[Iterable[str]] = None,
    mode: str = MODE_LEXICAL,
    dense: Optional[DenseResources] = None,
) -> Retrieval:
    """Chunk retrieval for one question; never raises, always logs one line.

    `mode` is MODE_LEXICAL (R1) or MODE_HYBRID (R2). `dense` overrides where
    hybrid mode gets its index and query embeddings (tests, eval harness);
    by default it is the committed index and the shared embedder.
    """
    started = time.perf_counter()
    try:
        outcome = _retrieve(question, knowledge, history, started, mode, dense)
    except Exception as exc:
        outcome = _failed(knowledge, exc, started, mode)
    if logger.isEnabledFor(logging.INFO):
        logger.info("Retrieval: %s", json.dumps(outcome.log_record(), ensure_ascii=False, sort_keys=True))
    return outcome


_warned_modes: Set[str] = set()


def configured_mode() -> str:
    """`RETRIEVAL_MODE`, read per call so a test or a restart needs no reload.

    Unset means today's selector. An unrecognised value also means today's
    selector, with one warning per value - a typo in deploy config must not
    switch retrieval on, or off, silently.
    """
    raw = os.getenv(MODE_ENV, "").strip().lower()
    if not raw:
        return DEFAULT_MODE
    if raw in MODES:
        return raw
    if raw not in _warned_modes:
        _warned_modes.add(raw)
        logger.warning("%s=%r is not one of %s; using %s", MODE_ENV, raw, ", ".join(MODES), DEFAULT_MODE)
    return DEFAULT_MODE


def select(
    question: str,
    knowledge: Knowledge,
    history: Optional[Iterable[str]] = None,
) -> Selection:
    """What `main.py` calls: the configured retriever, as a `Selection`."""
    mode = configured_mode()
    if mode in (MODE_LEXICAL, MODE_HYBRID):
        return retrieve(question, knowledge, history, mode=mode).selection
    return selection.select(question, knowledge, history)
