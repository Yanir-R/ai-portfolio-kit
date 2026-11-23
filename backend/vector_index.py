"""The committed vector index: schema, build, staleness and load (plan section 5).

`backend/index/chunks.v1.json` holds one header and one record per project
or writing chunk (plan section 5.1). It is built offline by
`tools/build_index.py`, committed, and baked into the image with the docs.
Profile documents are the always-sent core and are not indexed.

Everything here reuses the runtime's own pieces instead of a second copy:

- the corpus is `context._build()` / `context.get_knowledge()` (one reader);
- chunks are `chunking.chunk_section` (one chunker, `CHUNKER_VERSION`), so an
  index chunk and a runtime chunk share `chunk_id`, offsets and
  `content_hash`, and the vectors can be aligned to the BM25 index by id;
- the embedded text is `embedding_text(chunk)`, the same
  `{doc_label} › {headings}` prefix plus chunk text BM25 indexes.

**Staleness (Decided by Yanir 2026-11-23).** `corpus_hash` covers the bytes of
every readable file in the three content directories (the set
`context._fingerprint` walks), plus the chunker version, the embedding model
and the dimension. Content, not mtimes: a checkout or Docker `COPY` rewrites
mtimes. If the header hash does not match the live docs, or any schema,
dimension or offset check fails, the load result says so and the retriever
serves keyword-only. Nothing here raises into a request.

**Load-time checks** (plan section 5.1, "How the fields are used"): required
fields and types; `schema_version`; header model and dimension equal the
pins; every chunk's model / dimension agree with the header and its vector
has that length; every `doc_label` exists in the live corpus; every
`body[char_start:char_end]` hashes to `content_hash`; and the indexed chunks
are exactly the chunks the live chunker produces.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import tempfile
from dataclasses import dataclass
from typing import Callable, Dict, Iterable, List, Optional, Sequence, Tuple

import context
from chunking import CHUNKER_VERSION, Chunk, chunk_section, doc_kind_of, doc_title_of
from context import Knowledge
from docs_helper import BASE_DIR, parse_writing_metadata
from embedding import DIMENSIONS, EMBEDDING_MODEL, Vector, unit

SCHEMA_VERSION = "1"
INDEX_DIR = os.path.join(BASE_DIR, "index")
INDEX_PATH = os.path.join(INDEX_DIR, "chunks.v1.json")

# Repo-relative paths start here, in the image (where backend/ is /app) as
# in a checkout, so `doc_path` and `corpus_hash` are the same in both.
REPO_PREFIX = "backend"

# Load statuses. Stable strings: logged and tested.
LOAD_OK = "ok"
LOAD_MISSING = "missing"
LOAD_UNREADABLE = "unreadable"
LOAD_INVALID = "invalid"
LOAD_STALE = "stale"

HEADER_FIELDS: Dict[str, type] = {
    "schema_version": str,
    "corpus_hash": str,
    "built_at": str,
    "embedding_model": str,
    "dimensions": int,
    "chunker_version": str,
}

CHUNK_FIELDS: Dict[str, Tuple[type, ...]] = {
    "chunk_id": (str,),
    "doc_label": (str,),
    "doc_kind": (str,),
    "doc_path": (str,),
    "doc_slug": (str,),
    "doc_title": (str,),
    "heading": (str,),
    "heading_path": (list,),
    "chunk_index": (int,),
    "chunk_count": (int,),
    "char_start": (int,),
    "char_end": (int,),
    "token_estimate": (int,),
    "content_hash": (str,),
    "doc_hash": (str,),
    "published": (str, type(None)),
    "embedding_model": (str,),
    "dimensions": (int,),
    "embedding": (list,),
}

# Stored precision. Seven decimals keeps cosine ranks stable at 768 dims and
# keeps the committed file small enough to review; vectors are re-normalised
# at load.
EMBEDDING_DECIMALS = 7


class IndexProblem(Exception):
    """Why an index cannot be served. `status` is LOAD_INVALID or LOAD_STALE.

    `reason` is a stable code; nothing in it comes from a visitor.
    """

    def __init__(self, status: str, reason: str) -> None:
        super().__init__(reason)
        self.status = status
        self.reason = reason


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def repo_path(path: str) -> str:
    return "/".join([REPO_PREFIX, *os.path.relpath(path, BASE_DIR).split(os.sep)])


def content_files() -> List[str]:
    """Every readable corpus file, in the order `context._fingerprint` walks them."""
    files: List[str] = []
    for directory in context._CONTENT_DIRS:
        if not os.path.isdir(directory):
            continue
        for name in sorted(os.listdir(directory)):
            path = os.path.join(directory, name)
            if name.endswith(context._READABLE_SUFFIXES) and os.path.isfile(path):
                files.append(path)
    return files


def corpus_hash(
    files: Optional[Iterable[str]] = None,
    chunker_version: str = CHUNKER_VERSION,
    model: str = EMBEDDING_MODEL,
    dimensions: int = DIMENSIONS,
) -> str:
    """SHA-256 of sorted (repo path, file bytes) pairs plus the build pins.

    Each part is length-prefixed so no two different inputs can concatenate to
    the same byte stream.
    """
    digest = hashlib.sha256()

    def part(data: bytes) -> None:
        digest.update(str(len(data)).encode("ascii") + b":" + data)

    for path in sorted(files if files is not None else content_files(), key=repo_path):
        with open(path, "rb") as handle:
            data = handle.read()
        part(repo_path(path).encode("utf-8"))
        part(data)
    for pin in (chunker_version, model, str(dimensions)):
        part(pin.encode("utf-8"))
    return digest.hexdigest()


@dataclass(frozen=True)
class DocRecord:
    """File-side facts about one corpus document (fields of plan section 5.1)."""

    doc_path: str
    doc_slug: str
    doc_hash: str
    published: Optional[str]


def document_records(knowledge: Knowledge, files: Optional[Iterable[str]] = None) -> Dict[str, DocRecord]:
    """`doc_label` -> file facts, by matching each body to the file it was read from.

    Matching on content, not on a re-derived label, keeps `context.py` the
    only owner of the label format. A body no file explains, or two files
    with one body, is an error: the index must map every chunk to one file.
    """
    by_body: Dict[str, List[str]] = {}
    for path in files if files is not None else content_files():
        by_body.setdefault(context._read(path).strip(), []).append(path)

    records: Dict[str, DocRecord] = {}
    for section in knowledge.sections:
        if section.is_profile:
            continue
        paths = by_body.get(section.body, [])
        if len(paths) != 1:
            raise IndexProblem(LOAD_INVALID, "document_file_not_unique" if paths else "document_file_not_found")
        path = paths[0]
        with open(path, "rb") as handle:
            raw = handle.read()
        published = None
        if doc_kind_of(section.label) == "writing":
            value = parse_writing_metadata(section.body).get("date")
            published = value if isinstance(value, str) and value else None
        records[section.label] = DocRecord(
            doc_path=repo_path(path),
            doc_slug=os.path.splitext(os.path.basename(path))[0],
            doc_hash=_sha256(raw),
            published=published,
        )
    return records


def indexed_chunks(knowledge: Knowledge) -> Tuple[Chunk, ...]:
    """The chunks an index covers: every non-profile section, in corpus order."""
    out: List[Chunk] = []
    for section in knowledge.sections:
        if not section.is_profile:
            out.extend(chunk_section(section))
    return tuple(out)


def embedding_text(chunk: Chunk) -> str:
    """What is embedded for a chunk: the BM25 text, prefix included (plan section 2.2)."""
    return f"{chunk.context_prefix}\n{chunk.text}"


def _record(chunk: Chunk, doc: DocRecord, model: str, dimensions: int, vector: Sequence[float]) -> Dict[str, object]:
    return {
        "chunk_id": chunk.chunk_id,
        "doc_label": chunk.doc_label,
        "doc_kind": chunk.doc_kind,
        "doc_path": doc.doc_path,
        "doc_slug": doc.doc_slug,
        "doc_title": chunk.doc_title,
        "heading": chunk.heading,
        "heading_path": list(chunk.heading_path),
        "chunk_index": chunk.chunk_index,
        "chunk_count": chunk.chunk_count,
        "char_start": chunk.char_start,
        "char_end": chunk.char_end,
        "token_estimate": chunk.token_estimate,
        "content_hash": chunk.content_hash,
        "doc_hash": doc.doc_hash,
        "published": doc.published,
        "embedding_model": model,
        "dimensions": dimensions,
        "embedding": [round(float(v), EMBEDDING_DECIMALS) for v in vector],
    }


def reusable_vectors(
    previous: Optional[Dict[str, object]], model: str = EMBEDDING_MODEL, dimensions: int = DIMENSIONS
) -> Dict[Tuple[str, str], List[float]]:
    """(chunk_id, content_hash) -> vector from an older index built with the same model and dimension."""
    reusable: Dict[Tuple[str, str], List[float]] = {}
    if not previous or previous.get("embedding_model") != model or previous.get("dimensions") != dimensions:
        return reusable
    for old in previous.get("chunks", []) or []:
        if isinstance(old, dict) and isinstance(old.get("embedding"), list) and len(old["embedding"]) == dimensions:
            reusable[(str(old.get("chunk_id")), str(old.get("content_hash")))] = old["embedding"]
    return reusable


def chunks_to_embed(chunks: Sequence[Chunk], reusable: Dict[Tuple[str, str], List[float]]) -> List[Chunk]:
    """New or changed chunks: the only ones a build sends to the API."""
    return [c for c in chunks if (c.chunk_id, c.content_hash) not in reusable]


@dataclass(frozen=True)
class BuildResult:
    payload: Dict[str, object]
    embedded: int
    reused: int


def build_payload(
    knowledge: Knowledge,
    embed: Callable[[List[str]], List[Vector]],
    *,
    built_at: str,
    model: str = EMBEDDING_MODEL,
    dimensions: int = DIMENSIONS,
    hash_of_corpus: Optional[str] = None,
    files: Optional[Iterable[str]] = None,
    previous: Optional[Dict[str, object]] = None,
) -> BuildResult:
    """Header plus one record per chunk; only new or changed chunks are embedded.

    A chunk's previous vector is reused when the old index has the same
    `chunk_id` and `content_hash` under the same model and dimension
    (plan section 5, "Incremental re-embed"). `embed` receives the texts to
    embed, in order, and must return one vector per text.
    """
    file_list = list(files) if files is not None else content_files()
    docs = document_records(knowledge, file_list)
    chunks = indexed_chunks(knowledge)

    reusable = reusable_vectors(previous, model, dimensions)
    missing = chunks_to_embed(chunks, reusable)
    fresh = embed([embedding_text(c) for c in missing]) if missing else []
    if len(fresh) != len(missing):
        raise IndexProblem(LOAD_INVALID, "embedding_count_mismatch")
    new_vectors = {c.chunk_id: v for c, v in zip(missing, fresh)}

    records = []
    for chunk in chunks:
        vector = new_vectors.get(chunk.chunk_id) or reusable[(chunk.chunk_id, chunk.content_hash)]
        if len(vector) != dimensions:
            raise IndexProblem(LOAD_INVALID, "embedding_dimension_mismatch")
        records.append(_record(chunk, docs[chunk.doc_label], model, dimensions, vector))

    payload: Dict[str, object] = {
        "schema_version": SCHEMA_VERSION,
        "corpus_hash": hash_of_corpus
        or corpus_hash(file_list, CHUNKER_VERSION, model, dimensions),
        "built_at": built_at,
        "embedding_model": model,
        "dimensions": dimensions,
        "chunker_version": CHUNKER_VERSION,
        "chunks": records,
    }
    return BuildResult(payload=payload, embedded=len(missing), reused=len(chunks) - len(missing))


def serialise(payload: Dict[str, object]) -> str:
    """Header fields one per line, then one line per chunk: reviewable diffs."""
    header = {k: payload[k] for k in HEADER_FIELDS}
    lines = ["{"]
    for key, value in header.items():
        lines.append(f"  {json.dumps(key)}: {json.dumps(value, ensure_ascii=False)},")
    lines.append('  "chunks": [')
    chunks = payload.get("chunks", [])
    for i, chunk in enumerate(chunks):
        sep = "," if i < len(chunks) - 1 else ""
        lines.append("    " + json.dumps(chunk, ensure_ascii=False, separators=(",", ":")) + sep)
    lines.append("  ]")
    lines.append("}")
    return "\n".join(lines) + "\n"


def write_payload(path: str, payload: Dict[str, object]) -> None:
    """Atomic: temp file in the same directory, then rename. A failed build leaves the old file."""
    directory = os.path.dirname(path) or "."
    os.makedirs(directory, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".chunks.", suffix=".tmp", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(serialise(payload))
        os.replace(temp, path)
    except BaseException:
        if os.path.exists(temp):
            os.unlink(temp)
        raise


# --- validation and load -------------------------------------------------------------


@dataclass(frozen=True)
class LoadedIndex:
    """A validated index: its header and one unit vector per chunk id."""

    header: Dict[str, object]
    vectors: Dict[str, Vector]

    @property
    def model(self) -> str:
        return str(self.header["embedding_model"])

    @property
    def dimensions(self) -> int:
        return int(self.header["dimensions"])


@dataclass(frozen=True)
class IndexLoad:
    """What loading found. `index` is set only when `status` is LOAD_OK."""

    status: str
    reason: str
    index: Optional[LoadedIndex] = None

    @property
    def ok(self) -> bool:
        return self.status == LOAD_OK and self.index is not None


def _require(condition: bool, reason: str, status: str = LOAD_INVALID) -> None:
    if not condition:
        raise IndexProblem(status, reason)


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate_payload(
    payload: object,
    knowledge: Knowledge,
    *,
    expected_corpus_hash: str,
    model: str = EMBEDDING_MODEL,
    dimensions: int = DIMENSIONS,
) -> LoadedIndex:
    """Every plan section 5.1 check; raises IndexProblem with a stable reason."""
    _require(isinstance(payload, dict), "not_an_object")
    assert isinstance(payload, dict)
    for name, kind in HEADER_FIELDS.items():
        _require(isinstance(payload.get(name), kind) and not isinstance(payload.get(name), bool), f"header_{name}")
    _require(payload["schema_version"] == SCHEMA_VERSION, "schema_version")
    _require(isinstance(payload.get("chunks"), list), "chunks_not_a_list")

    # Staleness before shape detail: a stale file is the expected case after a doc edit.
    _require(payload["corpus_hash"] == expected_corpus_hash, "corpus_hash_mismatch", LOAD_STALE)
    _require(payload["chunker_version"] == CHUNKER_VERSION, "chunker_version_mismatch", LOAD_STALE)
    _require(payload["embedding_model"] == model, "embedding_model_mismatch", LOAD_STALE)
    _require(payload["dimensions"] == dimensions, "dimensions_mismatch", LOAD_STALE)

    bodies = {s.label: s.body for s in knowledge.sections}
    live = {c.chunk_id: c for c in indexed_chunks(knowledge)}
    vectors: Dict[str, Vector] = {}
    for record in payload["chunks"]:
        _require(isinstance(record, dict), "chunk_not_an_object")
        for name, kinds in CHUNK_FIELDS.items():
            value = record.get(name)
            _require(name in record and isinstance(value, kinds) and not isinstance(value, bool), f"chunk_{name}")
        _require(record["embedding_model"] == payload["embedding_model"], "chunk_model_differs_from_header")
        _require(record["dimensions"] == payload["dimensions"], "chunk_dimensions_differ_from_header")
        _require(len(record["embedding"]) == dimensions, "embedding_length")
        _require(all(_is_number(v) for v in record["embedding"]), "embedding_not_numeric")
        _require(record["doc_kind"] in ("project", "writing"), "doc_kind")
        _require(record["chunk_id"] not in vectors, "duplicate_chunk_id")

        label = record["doc_label"]
        _require(label in bodies, "doc_label_not_in_corpus", LOAD_STALE)
        body = bodies[label]
        start, end = record["char_start"], record["char_end"]
        _require(0 <= start < end <= len(body), "offsets_out_of_range", LOAD_STALE)
        _require(_sha256(body[start:end].encode("utf-8")) == record["content_hash"], "content_hash_mismatch", LOAD_STALE)

        chunk = live.get(record["chunk_id"])
        _require(chunk is not None, "chunk_not_produced_by_live_chunker", LOAD_STALE)
        assert chunk is not None
        _require(
            (chunk.doc_label, chunk.chunk_index, chunk.char_start, chunk.char_end, chunk.content_hash)
            == (label, record["chunk_index"], start, end, record["content_hash"]),
            "chunk_differs_from_live_chunker",
            LOAD_STALE,
        )
        vectors[record["chunk_id"]] = unit(record["embedding"])

    _require(set(vectors) == set(live), "chunk_set_differs_from_live_chunker", LOAD_STALE)
    header = {k: payload[k] for k in HEADER_FIELDS}
    return LoadedIndex(header=header, vectors=vectors)


def load_index(
    source: object,
    knowledge: Knowledge,
    *,
    expected_corpus_hash: str,
    model: str = EMBEDDING_MODEL,
    dimensions: int = DIMENSIONS,
) -> IndexLoad:
    """Load and validate from a path or an already-parsed payload. Never raises."""
    payload = source
    if isinstance(source, str):
        if not os.path.exists(source):
            return IndexLoad(LOAD_MISSING, "no_index_file")
        try:
            with open(source, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, ValueError):
            return IndexLoad(LOAD_UNREADABLE, "not_readable_json")
    try:
        index = validate_payload(
            payload, knowledge, expected_corpus_hash=expected_corpus_hash, model=model, dimensions=dimensions
        )
    except IndexProblem as problem:
        return IndexLoad(problem.status, problem.reason)
    except Exception as exc:  # a malformed file must degrade, never crash the process
        return IndexLoad(LOAD_INVALID, f"unexpected_{type(exc).__name__}")
    return IndexLoad(LOAD_OK, "valid", index)


def load_runtime_index(knowledge: Knowledge) -> IndexLoad:
    """The committed index against the live docs and the pinned model (hybrid mode)."""
    try:
        expected = corpus_hash()
    except OSError:
        return IndexLoad(LOAD_UNREADABLE, "corpus_not_hashable")
    return load_index(INDEX_PATH, knowledge, expected_corpus_hash=expected)


@dataclass(frozen=True)
class CheckResult:
    """The CI / pytest staleness verdict on the committed index. Offline."""

    ok: bool
    status: str
    reason: str


def check_committed(knowledge: Knowledge) -> CheckResult:
    """Fails only when an index is committed and does not match the live docs.

    No committed index is not a failure: hybrid mode then serves BM25 only,
    which is the documented state until the real index is built (needs the
    live embedding step). Once an index is committed, any doc edit without a
    rebuild fails here, which blocks the merge.
    """
    if not os.path.exists(INDEX_PATH):
        return CheckResult(True, LOAD_MISSING, "no_index_file")
    load = load_runtime_index(knowledge)
    return CheckResult(load.ok, load.status, load.reason)
