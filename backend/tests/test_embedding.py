"""Query embeddings: one reused client, the LRU, the timeout and the error paths.

Fake clients only (tests/fake_embeddings.py); conftest forbids a live one.
"""

import math
import time

import pytest
from google.genai import types

import embedding
from embedding import (
    CACHE_HIT,
    CACHE_MISS,
    STATUS_EMPTY,
    STATUS_ERROR,
    STATUS_NO_CLIENT,
    STATUS_OK,
    STATUS_TIMEOUT,
)
from fake_embeddings import FakeEmbeddingClient, raiser, sleeper

# Captured at import, before conftest swaps the factory out for the forbidden one.
REAL_FACTORY = embedding.gemini_client


def _embedder(client=None, **kwargs):
    client = client or FakeEmbeddingClient(dimensions=8)
    made = []

    def factory():
        made.append(1)
        return client

    kwargs.setdefault("dimensions", 8)
    return embedding.QueryEmbedder(client_factory=factory, model="m", **kwargs), client, made


def test_the_second_identical_question_is_a_cache_hit_on_one_client():
    embedder, client, made = _embedder()
    first = embedder.embed("What is ReelSensei?")
    second = embedder.embed("What is ReelSensei?")
    assert (first.status, first.cache) == (STATUS_OK, CACHE_MISS)
    assert (second.status, second.cache) == (STATUS_OK, CACHE_HIT)
    assert first.vector == second.vector
    assert len(client.models.calls) == 1
    assert made == [1]


def test_one_client_is_reused_for_every_miss():
    embedder, client, made = _embedder()
    for question in ("one", "two", "three"):
        embedder.embed(question)
    assert len(client.models.calls) == 3 and made == [1]


def test_the_key_is_normalised_nfkc_case_whitespace_and_niqqud():
    embedder, client, _ = _embedder()
    embedder.embed("Tell me about  ReelSensei")
    assert embedder.embed("tell me ABOUT ReelSensei ").cache == CACHE_HIT
    embedder.embed("שָׁלוֹם עולם")
    assert embedder.embed("שלום   עולם").cache == CACHE_HIT
    # NFKC: a full-width letter is the same key as its ASCII form.
    embedder.embed("ｅvals")
    assert embedder.embed("evals").cache == CACHE_HIT
    assert len(client.models.calls) == 3


def test_the_embedded_text_is_the_normalised_key_so_order_cannot_change_a_vector():
    embedder, client, _ = _embedder()
    embedder.embed("  ReelSensei   Login ")
    assert client.models.calls[0]["texts"] == ["reelsensei login"]


def test_final_letters_are_not_folded_in_the_embedded_text():
    assert embedding.normalise_query("פרויקטים") == "פרויקטים"


def test_the_cache_key_carries_model_and_dimension():
    embedder, _, _ = _embedder()
    assert embedder._key("q") == ("q", "m", 8)


def test_the_lru_is_bounded_and_evicts_the_least_recently_used():
    embedder, client, _ = _embedder(cache_size=2)
    embedder.embed("a1")
    embedder.embed("b2")
    embedder.embed("a1")  # refresh a1
    embedder.embed("c3")  # evicts b2
    assert len(embedder) == 2
    assert embedder.cached("a1") and embedder.cached("c3") and not embedder.cached("b2")
    assert embedder.embed("b2").cache == CACHE_MISS


def test_vectors_are_unit_length():
    embedder, _, _ = _embedder(FakeEmbeddingClient(dimensions=8, vector_for=lambda _t: [3.0, 4.0] + [0.0] * 6))
    vector = embedder.embed("anything").vector
    assert math.isclose(math.sqrt(sum(v * v for v in vector)), 1.0)
    assert vector[:2] == pytest.approx((0.6, 0.8))


def test_the_request_uses_the_query_task_type_and_the_pinned_dimension():
    client = FakeEmbeddingClient(dimensions=embedding.DIMENSIONS)
    embedder = embedding.QueryEmbedder(client_factory=lambda: client)
    embedder.embed("evals")
    call = client.models.calls[0]
    assert call["model"] == embedding.EMBEDDING_MODEL == "gemini-embedding-2"
    assert call["config"].task_type == "RETRIEVAL_QUERY"
    assert call["config"].output_dimensionality == 768


def test_a_slow_call_times_out_and_is_not_cached():
    embedder, _, _ = _embedder(FakeEmbeddingClient(dimensions=8, behaviour=sleeper(0.5)), timeout_ms=50)
    started = time.perf_counter()
    result = embedder.embed("slow question")
    assert (time.perf_counter() - started) < 0.4
    assert (result.status, result.vector, result.error) == (STATUS_TIMEOUT, None, "TimeoutError")
    assert not embedder.cached("slow question")


def test_the_default_timeout_is_800_ms():
    assert embedding.QUERY_TIMEOUT_MS == 800
    assert embedding.QueryEmbedder(client_factory=lambda: None).timeout_ms == 800


def test_an_sdk_timeout_error_is_reported_as_a_timeout():
    class ReadTimeout(Exception):
        pass

    embedder, _, _ = _embedder(FakeEmbeddingClient(dimensions=8, behaviour=raiser(ReadTimeout("x"))))
    assert embedder.embed("q").status == STATUS_TIMEOUT


def test_an_api_error_reports_type_and_location_never_the_message():
    secret = "the visitor typed this"
    embedder, _, _ = _embedder(FakeEmbeddingClient(dimensions=8, behaviour=raiser(RuntimeError(secret))))
    result = embedder.embed("q")
    assert result.status == STATUS_ERROR and result.vector is None
    assert result.error.startswith("RuntimeError at fake_embeddings.py:")
    assert secret not in result.error


def test_a_wrong_dimension_answer_is_an_error_not_a_vector():
    embedder, _, _ = _embedder(FakeEmbeddingClient(dimensions=4))
    result = embedder.embed("q")
    assert result.status == STATUS_ERROR and result.error.startswith("EmbeddingShapeError")


def test_no_client_is_resolved_once_and_reported():
    made = []

    def factory():
        made.append(1)
        return None

    embedder = embedding.QueryEmbedder(client_factory=factory, dimensions=8)
    assert embedder.embed("a").status == STATUS_NO_CLIENT
    assert embedder.embed("b").status == STATUS_NO_CLIENT
    assert made == [1]


def test_a_failing_factory_is_an_error_not_an_exception():
    embedder = embedding.QueryEmbedder(client_factory=raiser(OSError("x")), dimensions=8)
    assert embedder.embed("a").status == STATUS_ERROR


def test_an_empty_question_makes_no_call():
    embedder, client, made = _embedder()
    assert embedder.embed("   ").status == STATUS_EMPTY
    assert client.models.calls == [] and made == []


def test_the_real_factory_builds_nothing_without_a_key(monkeypatch):
    monkeypatch.delenv(embedding.API_KEY_ENV, raising=False)
    assert REAL_FACTORY() is None


def test_the_shared_embedder_is_one_instance_with_the_pins():
    first, second = embedding.shared_embedder(), embedding.shared_embedder()
    assert first is second
    assert (first.model, first.dimensions, first.timeout_ms, first.cache_size) == (
        "gemini-embedding-2", 768, 800, 512
    )


def test_document_embedding_wraps_each_text_in_its_own_content_and_batches():
    client = FakeEmbeddingClient(dimensions=8)
    vectors = embedding.embed_documents(client, ["a text", "b text", "c text"], model="m", dimensions=8, batch_size=2)
    assert len(vectors) == 3
    calls = client.models.calls
    assert [len(c["texts"]) for c in calls] == [2, 1]
    assert calls[0]["config"].task_type == "RETRIEVAL_DOCUMENT"
    assert calls[0]["config"].output_dimensionality == 8


def test_document_embedding_sends_content_objects_not_bare_strings(monkeypatch):
    seen = {}

    class Models:
        def embed_content(self, model, contents, config):
            seen["contents"] = contents
            return type("R", (), {"embeddings": [type("E", (), {"values": [1.0] * 8})() for _ in contents]})()

    client = type("C", (), {"models": Models()})()
    embedding.embed_documents(client, ["x", "y"], model="m", dimensions=8)
    assert all(isinstance(item, types.Content) for item in seen["contents"])


def test_document_embedding_fails_loudly_on_a_count_mismatch():
    class Models:
        def embed_content(self, model, contents, config):
            return type("R", (), {"embeddings": []})()

    client = type("C", (), {"models": Models()})()
    with pytest.raises(embedding.EmbeddingShapeError):
        embedding.embed_documents(client, ["x"], model="m", dimensions=8)
