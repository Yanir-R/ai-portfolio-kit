"""A deterministic, offline stand-in for the Gemini embedding client.

**Not a model and not a quality signal.** Vectors are a signed hashing-trick
bag of the lexical tokenizer's terms, so "similar" here means "shares
stemmed words" - the dense leg then mostly re-ranks what BM25 already found.
It exists so the hybrid plumbing (index build and load, LRU, timeout and
error paths, cosine, RRF, budget, logging) can be tested without a network,
a key or quota. Nothing built with it may be committed as an index, and no
number it produces may be reported as an R2 quality result.

`FakeEmbeddingClient` mimics the one call the code uses:
`client.models.embed_content(model=, contents=, config=)`, returning an object
with `.embeddings[i].values`.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from typing import Callable, List, Optional, Sequence

from lexical import index_terms

FAKE_MODEL = "fake-hashed-terms-v1"
FAKE_DIMENSIONS = 64


def fake_vector(text: str, dimensions: int = FAKE_DIMENSIONS) -> List[float]:
    """Signed feature hashing of the lexical terms of `text`. Deterministic."""
    values = [0.0] * dimensions
    for term in index_terms(text):
        digest = hashlib.sha256(term.encode("utf-8")).digest()
        slot = int.from_bytes(digest[:4], "big") % dimensions
        values[slot] += 1.0 if digest[4] & 1 else -1.0
    if not any(values):
        # A text with no terms still gets a fixed, non-zero direction.
        values[0] = 1.0
    return values


def fake_embed_texts(texts: Sequence[str], dimensions: int = FAKE_DIMENSIONS) -> List[List[float]]:
    return [fake_vector(text, dimensions) for text in texts]


@dataclass
class _Embedding:
    values: List[float]


@dataclass
class _Response:
    embeddings: List[_Embedding]


def _texts(contents) -> List[str]:
    if isinstance(contents, str):
        return [contents]
    out = []
    for item in contents:
        if isinstance(item, str):
            out.append(item)
        else:  # a google.genai types.Content with one text part
            out.append("".join(part.text or "" for part in item.parts))
    return out


@dataclass
class FakeModels:
    dimensions: int = FAKE_DIMENSIONS
    vector_for: Optional[Callable[[str], List[float]]] = None
    behaviour: Optional[Callable[[], None]] = None  # e.g. sleep or raise, run before answering
    calls: List[dict] = field(default_factory=list)

    def embed_content(self, model, contents, config=None):
        texts = _texts(contents)
        self.calls.append({"model": model, "texts": texts, "config": config})
        if self.behaviour is not None:
            self.behaviour()
        make = self.vector_for or (lambda text: fake_vector(text, self.dimensions))
        return _Response(embeddings=[_Embedding(values=list(make(text))) for text in texts])


class FakeEmbeddingClient:
    def __init__(self, **kwargs) -> None:
        self.models = FakeModels(**kwargs)


def sleeper(seconds: float) -> Callable[[], None]:
    return lambda: time.sleep(seconds)


def raiser(exc: BaseException) -> Callable[[], None]:
    def go() -> None:
        raise exc

    return go


# --- wiring helpers for tests and the plumbing harness ----------------------------


def fake_embedder(client=None, model: str = FAKE_MODEL, dimensions: int = FAKE_DIMENSIONS, **kwargs):
    """A real `embedding.QueryEmbedder` around a fake client (LRU, timeout and all)."""
    import embedding

    client = client if client is not None else FakeEmbeddingClient(dimensions=dimensions)
    return embedding.QueryEmbedder(client_factory=lambda: client, model=model, dimensions=dimensions, **kwargs)


def toy_dense(knowledge, embedder, vector_for: Optional[Callable[[str], List[float]]] = None):
    """DenseResources over an in-memory index for a toy corpus (no files behind it).

    Chunk vectors come from `vector_for(embedding_text(chunk))`, default the
    hashing fake. The loader counts its calls in `.calls`.
    """
    import embedding
    import retrieval
    import vector_index

    make = vector_for or (lambda text: fake_vector(text, embedder.dimensions))
    header = {"embedding_model": embedder.model, "dimensions": embedder.dimensions}
    vectors = {
        chunk.chunk_id: embedding.unit(make(vector_index.embedding_text(chunk)))
        for chunk in vector_index.indexed_chunks(knowledge)
    }

    def loader(_knowledge):
        loader.calls += 1
        return vector_index.IndexLoad(vector_index.LOAD_OK, "valid", vector_index.LoadedIndex(header, vectors))

    loader.calls = 0
    return retrieval.DenseResources(loader=loader, embedder=embedder)


def committed_corpus_payload(knowledge, model: str = FAKE_MODEL, dimensions: int = FAKE_DIMENSIONS):
    """A schema-complete payload for the committed docs, with FAKE vectors. In memory only."""
    import vector_index

    return vector_index.build_payload(
        knowledge,
        lambda texts: fake_embed_texts(texts, dimensions),
        built_at="2026-11-23T00:00:00Z",
        model=model,
        dimensions=dimensions,
    ).payload


def committed_corpus_dense(knowledge, embedder):
    """DenseResources over a fake-vector index of the committed docs, validated like production."""
    import retrieval
    import vector_index

    payload = committed_corpus_payload(knowledge, embedder.model, embedder.dimensions)
    expected = vector_index.corpus_hash(model=embedder.model, dimensions=embedder.dimensions)

    def loader(live):
        loader.calls += 1
        return vector_index.load_index(
            payload, live, expected_corpus_hash=expected, model=embedder.model, dimensions=embedder.dimensions
        )

    loader.calls = 0
    return retrieval.DenseResources(loader=loader, embedder=embedder)
