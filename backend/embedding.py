"""Query and document embeddings for the dense retrieval leg (plan phase R2).

Two callers, two rules:

- **Queries** (request path, `RETRIEVAL_MODE=hybrid` only). One
  `embed_content` call per distinct question, on a **single reused client**,
  behind an in-memory LRU and a hard `QUERY_TIMEOUT_MS` bound. A timeout or
  any API error returns a result with no vector; the retriever then ranks
  with BM25 alone (plan section 6, "Fallback reconciliation"). Nothing here
  raises into the request.
- **Documents** (offline builder only, `tools/build_index.py`). Never called
  on a request or at start-up.

What is pinned and why (plan section 2.4):

- `gemini-embedding-2` at 768 dimensions, the multilingual model, through
  the already-pinned `google-genai` SDK. No new dependency.
- Task types `RETRIEVAL_QUERY` / `RETRIEVAL_DOCUMENT`, the official values,
  which win over prompt-prefix styles if the two ever disagree.
- Each document text is wrapped in its own `Content`: embedding-2
  aggregates several inputs placed directly in `contents` into **one**
  vector (plan section 5).
- Vectors are scaled to unit length here, so the retriever's cosine is a dot
  product and a provider-side normalisation change cannot skew scores.

The LRU (Decided by Yanir 2026-11-23, plan section 7): bounded, process
lifetime, never persisted. The key is the normalised query text plus the
model and the dimension, so a vector can never be scored against another
model's space. Visitor text lives only in that in-memory key; it is never
logged and never written to disk.

The key normalisation is NFKC, niqqud stripped, lower-case, whitespace
collapsed. Final-letter folding (`lexical.normalise`) is deliberately not
applied: the normalised text is also what is embedded, so two questions with
one key always get the same vector whichever arrives first, and folding would
send misspelled Hebrew to the model.
"""

from __future__ import annotations

import concurrent.futures
import math
import os
import threading
import time
import traceback
import unicodedata
from collections import OrderedDict
from dataclasses import dataclass
from typing import Callable, List, Optional, Sequence, Tuple

from lexical import strip_niqqud

EMBEDDING_MODEL = "gemini-embedding-2"
DIMENSIONS = 768

TASK_QUERY = "RETRIEVAL_QUERY"
TASK_DOCUMENT = "RETRIEVAL_DOCUMENT"

# Plan section 6.2: the dominant request-path cost, bounded hard. On expiry
# the dense leg is skipped for this request and BM25 carries it.
QUERY_TIMEOUT_MS = 800

# Plan section 7: about 512 x 768 floats, roughly 3 MB of Python floats.
QUERY_CACHE_SIZE = 512

# Offline builder only. One synchronous call covers today's ~22 chunks; the
# Batch API is an R4 option past ~1k chunks (plan section 5).
DOCUMENT_BATCH_SIZE = 100

API_KEY_ENV = "GEMINI_API_KEY"

# Status of one query embedding. Stable strings: logged and tested.
STATUS_OK = "ok"
STATUS_TIMEOUT = "timeout"
STATUS_ERROR = "error"
STATUS_NO_CLIENT = "no_client"
STATUS_EMPTY = "empty_query"

CACHE_HIT = "hit"
CACHE_MISS = "miss"
CACHE_NONE = "none"

Vector = Tuple[float, ...]


class EmbeddingShapeError(ValueError):
    """The API answered, but not with the vectors that were asked for."""


def where(exc: BaseException) -> str:
    """`file:line` of the innermost frame: enough to find a bug, no message text.

    The message is never logged; it could echo a visitor's words.
    """
    frames = traceback.extract_tb(exc.__traceback__)
    return f"{os.path.basename(frames[-1].filename)}:{frames[-1].lineno}" if frames else "unknown"


def normalise_query(text: str) -> str:
    """Cache key and embedded text: NFKC, no niqqud, lower-case, single spaces."""
    return " ".join(strip_niqqud(unicodedata.normalize("NFKC", text)).lower().split())


def unit(values: Sequence[float]) -> Vector:
    """Scaled to length 1; a zero vector stays zero (it then scores 0 everywhere)."""
    norm = math.sqrt(sum(v * v for v in values))
    if norm == 0.0:
        return tuple(0.0 for _ in values)
    return tuple(v / norm for v in values)


def _vectors(response, expected: int, dimensions: int) -> List[Vector]:
    embeddings = getattr(response, "embeddings", None) or []
    if len(embeddings) != expected:
        raise EmbeddingShapeError("embedding count mismatch")
    out: List[Vector] = []
    for embedding in embeddings:
        values = list(getattr(embedding, "values", None) or [])
        if len(values) != dimensions:
            raise EmbeddingShapeError("embedding dimension mismatch")
        out.append(unit(values))
    return out


def _config(task_type: str, dimensions: int):
    from google.genai import types

    return types.EmbedContentConfig(task_type=task_type, output_dimensionality=dimensions)


def gemini_client(timeout_ms: int = QUERY_TIMEOUT_MS):
    """The real client, or None when no key is configured.

    Reads the key from the environment only and never logs or returns it.
    Tests replace this factory (see tests/conftest.py); nothing in the test
    suite may build a live client.
    """
    api_key = os.getenv(API_KEY_ENV)
    if not api_key:
        return None
    from google import genai
    from google.genai import types

    return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=timeout_ms))


@dataclass(frozen=True)
class QueryEmbedding:
    """One query's dense vector, or why there is none. No visitor text."""

    vector: Optional[Vector]
    status: str
    cache: str
    elapsed_ms: float
    error: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.vector is not None


class QueryEmbedder:
    """Bounded-LRU, timeout-bounded query embeddings on one reused client.

    `client_factory` is called at most once (lazily, on the first miss); its
    result, or its absence, is kept for the life of the embedder. A client is
    anything with `client.models.embed_content(model=, contents=, config=)`.
    """

    def __init__(
        self,
        client_factory: Callable[[], object],
        model: str = EMBEDDING_MODEL,
        dimensions: int = DIMENSIONS,
        timeout_ms: int = QUERY_TIMEOUT_MS,
        cache_size: int = QUERY_CACHE_SIZE,
    ) -> None:
        self.model = model
        self.dimensions = dimensions
        self.timeout_ms = timeout_ms
        self.cache_size = cache_size
        self._client_factory = client_factory
        self._client: object = None
        self._client_resolved = False
        self._cache: "OrderedDict[Tuple[str, str, int], Vector]" = OrderedDict()
        self._lock = threading.Lock()
        # Two workers: one abandoned (timed-out) call cannot block the next
        # request's call. The SDK's own HTTP timeout ends the abandoned one.
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="query-embed")

    def _key(self, text: str) -> Tuple[str, str, int]:
        return (text, self.model, self.dimensions)

    def cached(self, text: str) -> bool:
        with self._lock:
            return self._key(normalise_query(text)) in self._cache

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def _client_or_none(self):
        with self._lock:
            if not self._client_resolved:
                self._client = self._client_factory()
                self._client_resolved = True
            return self._client

    def _call(self, client, text: str) -> Vector:
        response = client.models.embed_content(
            model=self.model,
            contents=text,
            config=_config(TASK_QUERY, self.dimensions),
        )
        return _vectors(response, 1, self.dimensions)[0]

    def embed(self, text: str) -> QueryEmbedding:
        started = time.perf_counter()

        def done(vector, status, cache, error=None) -> QueryEmbedding:
            return QueryEmbedding(vector, status, cache, (time.perf_counter() - started) * 1000.0, error)

        normalised = normalise_query(text)
        if not normalised:
            return done(None, STATUS_EMPTY, CACHE_NONE)
        key = self._key(normalised)
        with self._lock:
            hit = self._cache.get(key)
            if hit is not None:
                self._cache.move_to_end(key)
                return done(hit, STATUS_OK, CACHE_HIT)

        try:
            client = self._client_or_none()
        except Exception as exc:  # a broken factory must not break the request
            return done(None, STATUS_ERROR, CACHE_MISS, f"{type(exc).__name__} at {where(exc)}")
        if client is None:
            return done(None, STATUS_NO_CLIENT, CACHE_MISS)

        future = self._executor.submit(self._call, client, normalised)
        try:
            vector = future.result(timeout=self.timeout_ms / 1000.0)
        except concurrent.futures.TimeoutError:
            future.cancel()
            return done(None, STATUS_TIMEOUT, CACHE_MISS, "TimeoutError")
        except Exception as exc:
            name = type(exc).__name__
            # The SDK's own HTTP timeout surfaces as an httpx/timeout error.
            status = STATUS_TIMEOUT if "Timeout" in name else STATUS_ERROR
            return done(None, status, CACHE_MISS, f"{name} at {where(exc)}")

        with self._lock:
            self._cache[key] = vector
            self._cache.move_to_end(key)
            while len(self._cache) > self.cache_size:
                self._cache.popitem(last=False)
        return done(vector, STATUS_OK, CACHE_MISS)


_shared: Optional[QueryEmbedder] = None
_shared_lock = threading.Lock()


def shared_embedder() -> QueryEmbedder:
    """The process-wide query embedder: one client, one LRU."""
    global _shared
    with _shared_lock:
        if _shared is None:
            _shared = QueryEmbedder(client_factory=lambda: gemini_client(QUERY_TIMEOUT_MS))
        return _shared


def _reset_shared() -> None:
    """For tests: forget the shared embedder (and its client and cache)."""
    global _shared
    with _shared_lock:
        _shared = None


def embed_documents(
    client,
    texts: Sequence[str],
    model: str = EMBEDDING_MODEL,
    dimensions: int = DIMENSIONS,
    batch_size: int = DOCUMENT_BATCH_SIZE,
) -> List[Vector]:
    """Offline builder only: one unit vector per text, in order.

    Every text is its own `Content`, so the API returns one vector per text
    instead of one aggregate vector. Raises on any shape mismatch: a build
    must fail loudly rather than write a half-right index.
    """
    from google.genai import types

    vectors: List[Vector] = []
    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        response = client.models.embed_content(
            model=model,
            contents=[types.Content(parts=[types.Part(text=text)]) for text in batch],
            config=_config(TASK_DOCUMENT, dimensions),
        )
        vectors.extend(_vectors(response, len(batch), dimensions))
    return vectors
