"""Hybrid retrieval (plan phase R2): dense leg, RRF, fallbacks, flag, logging, latency.

FAKE embeddings only. These tests prove the plumbing - which chunks qualify,
how ranks fuse, that every failure lands on the R1 lexical result or the
core, and that nothing leaks into the log. They say nothing about retrieval
quality; that needs a real index and `measure_r2.py` (pending Yanir's OK).
"""

import json
import logging
import statistics
import time
from pathlib import Path

import pytest
from starlette.testclient import TestClient

import context
import embedding
import main
import retrieval
import selection
import vector_index
from context import Knowledge, Section
from fake_embeddings import (
    FakeEmbeddingClient,
    committed_corpus_dense,
    fake_embedder,
    raiser,
    sleeper,
    toy_dense,
)
from retrieval import CORE_ONLY, DENSE_INDEX_UNAVAILABLE, DENSE_MODEL_MISMATCH, DENSE_OK, MODE_HYBRID
from selection import CONVERSATIONAL, NARROWED

HERE = Path(__file__).resolve().parent

PROFILE = (
    ("Profile / about-me", "I build AI products end to end and then try to break them."),
    ("Profile / resume", "Moonsite, full stack developer, sports betting platform."),
)

TOY = Knowledge(
    sections=tuple(
        Section(label=label, body=body)
        for label, body in (
            *PROFILE,
            ("Project / ReelSensei", "A gaming highlights tool, paused, built with Python."),
            ("Writing / Cursor tokens", "Cursor burned 22.7 million tokens in one session."),
            ("Writing / Nothing found", "Agent tool calls returning nothing, and the three meanings."),
        )
    )
)

DIMS = 8
# Concept axes for the toy vectors: a hand-made "embedding space" in which
# "evaluations" lands next to the post about empty tool results, although
# the two share no word. This is the paraphrase case, staged.
CONCEPTS = (
    ("gaming", "videogame"),
    ("tokens", "spend", "bill"),
    ("nothing", "evaluations"),
)


def concept_vector(text: str):
    lowered = text.lower()
    values = [0.0] * DIMS
    for axis, words in enumerate(CONCEPTS):
        if any(word in lowered for word in words):
            values[axis] = 1.0
    if not any(values):
        values[DIMS - 1] = 1.0
    return values


def _toy(client=None, **kwargs):
    client = client or FakeEmbeddingClient(dimensions=DIMS, vector_for=concept_vector)
    embedder = fake_embedder(client, dimensions=DIMS, **kwargs)
    return toy_dense(TOY, embedder, concept_vector), client


def _hybrid(question, knowledge=TOY, dense=None, history=None):
    return retrieval.retrieve(question, knowledge, history, mode=MODE_HYBRID, dense=dense)


def _labels(result):
    return result.selection.knowledge.sources


# --- the dense leg and fusion ------------------------------------------------------------


def test_the_dense_leg_finds_a_post_that_shares_no_word_with_the_question():
    dense, _ = _toy()
    question = "Have you published evaluations?"
    assert retrieval.retrieve(question, TOY).outcome == CORE_ONLY
    result = _hybrid(question, dense=dense)
    assert result.outcome == NARROWED
    assert _labels(result) == (*(label for label, _ in PROFILE), "Writing / Nothing found")
    hit = result.sent[0]
    assert hit.bm25 == 0.0 and hit.cosine == pytest.approx(1.0)
    assert hit.fused == pytest.approx(1.0 / (retrieval.RRF_K + 1))
    assert result.dense.status == DENSE_OK and result.dense.qualified == 1


def test_rrf_sums_reciprocal_ranks_and_a_chunk_in_both_lists_wins():
    index = retrieval._index_for(TOY)
    a, b, c = index.chunks
    lexical = (
        retrieval.ScoredChunk(chunk=a, bm25=3.0, coverage=1.0),
        retrieval.ScoredChunk(chunk=b, bm25=2.0, coverage=1.0),
    )
    cosines = [0.70, 0.10, 0.90]  # dense order: c, a; b is below MIN_COSINE
    fused = retrieval._fuse(lexical, cosines, [3.0, 2.0, 0.0], {a.doc_label: 1.0, b.doc_label: 1.0}, index)
    k = retrieval.RRF_K
    scores = {hit.chunk.chunk_id: hit.fused for hit in fused}
    assert scores[a.chunk_id] == pytest.approx(1 / (k + 1) + 1 / (k + 2))
    assert scores[b.chunk_id] == pytest.approx(1 / (k + 2))
    assert scores[c.chunk_id] == pytest.approx(1 / (k + 1))
    assert [hit.chunk.chunk_id for hit in fused] == [a.chunk_id, c.chunk_id, b.chunk_id]
    assert fused[1].bm25 == 0.0 and fused[1].coverage == 0.0


def test_rrf_ties_break_on_corpus_order_then_chunk_order():
    index = retrieval._index_for(TOY)
    fused = retrieval._fuse((), [0.9, 0.9, 0.9], None, {}, index)
    assert [hit.chunk.chunk_id for hit in fused] == [chunk.chunk_id for chunk in index.chunks]


def test_lexical_candidates_always_survive_fusion(fresh_corpus_cache):
    knowledge = context.get_knowledge()
    dense = committed_corpus_dense(knowledge, fake_embedder(dimensions=64))
    for case in _questions():
        lexical = {h.chunk.chunk_id for h in retrieval.retrieve(case["question"], knowledge).candidates}
        hybrid = {h.chunk.chunk_id for h in _hybrid(case["question"], knowledge, dense).candidates}
        assert lexical <= hybrid


def test_with_no_dense_qualifier_hybrid_is_exactly_lexical(fresh_corpus_cache, monkeypatch):
    knowledge = context.get_knowledge()
    dense = committed_corpus_dense(knowledge, fake_embedder(dimensions=64))
    monkeypatch.setattr(retrieval, "MIN_COSINE", 1.01)
    for case in _questions():
        assert _hybrid(case["question"], knowledge, dense).selection == retrieval.retrieve(case["question"], knowledge).selection


def test_below_the_cosine_gate_and_no_word_match_is_core_only():
    dense, _ = _toy()
    result = _hybrid("quantum annealing", dense=dense)
    assert result.outcome == CORE_ONLY and _labels(result) == tuple(label for label, _ in PROFILE)
    assert result.reason == retrieval.REASON_NO_TERM_IN_INDEX
    assert result.dense.status == DENSE_OK and result.dense.qualified == 0


def test_hybrid_ranking_is_deterministic():
    dense, _ = _toy()
    runs = [[h.chunk.chunk_id for h in _hybrid("gaming tokens nothing", dense=dense).candidates] for _ in range(3)]
    assert runs[0] == runs[1] == runs[2] and len(runs[0]) == 3


# --- fallbacks: every failure is the lexical result, or the core --------------------------


@pytest.mark.parametrize(
    "behaviour, status",
    [
        (sleeper(0.5), embedding.STATUS_TIMEOUT),
        (raiser(RuntimeError("visitor words here")), embedding.STATUS_ERROR),
    ],
)
def test_an_embedding_failure_falls_back_to_bm25(behaviour, status):
    client = FakeEmbeddingClient(dimensions=DIMS, vector_for=concept_vector, behaviour=behaviour)
    dense, _ = _toy(client, timeout_ms=50)
    for question in ("Tell me about ReelSensei gaming", "Have you published evaluations?"):
        result = _hybrid(question, dense=dense)
        assert result.selection == retrieval.retrieve(question, TOY).selection
        assert result.dense.status == status and all(hit.cosine is None for hit in result.candidates)
    # ...and with nothing lexical either, the core only: never the whole corpus.
    assert _hybrid("Have you published evaluations?", dense=dense).outcome == CORE_ONLY


def test_an_embedding_error_logs_type_and_location_only(caplog):
    client = FakeEmbeddingClient(dimensions=DIMS, behaviour=raiser(RuntimeError("visitor words here")))
    dense, _ = _toy(client)
    with caplog.at_level(logging.INFO, logger="retrieval"):
        _hybrid("Have you published evaluations?", dense=dense)
    record = _retrieval_records(caplog)[-1]
    assert record["dense"]["error"].startswith("RuntimeError at fake_embeddings.py:")
    assert "visitor words" not in caplog.text and "evaluations" not in caplog.text


@pytest.mark.parametrize(
    "load",
    [
        vector_index.IndexLoad(vector_index.LOAD_MISSING, "no_index_file"),
        vector_index.IndexLoad(vector_index.LOAD_STALE, "corpus_hash_mismatch"),
        vector_index.IndexLoad(vector_index.LOAD_INVALID, "embedding_length"),
        vector_index.IndexLoad(vector_index.LOAD_UNREADABLE, "not_readable_json"),
    ],
)
def test_an_unusable_index_never_scores_vectors(load):
    client = FakeEmbeddingClient(dimensions=DIMS)
    dense = retrieval.DenseResources(loader=lambda _k: load, embedder=fake_embedder(client, dimensions=DIMS))
    for question in ("Tell me about ReelSensei gaming", "quantum annealing"):
        result = _hybrid(question, dense=dense)
        assert result.selection == retrieval.retrieve(question, TOY).selection
        assert (result.dense.status, result.dense.index_status, result.dense.index_reason) == (
            DENSE_INDEX_UNAVAILABLE, load.status, load.reason
        )
    assert client.models.calls == []


def test_the_index_is_loaded_once_per_corpus_and_a_stale_one_logs_one_error(caplog):
    calls = []

    def loader(_knowledge):
        calls.append(1)
        return vector_index.IndexLoad(vector_index.LOAD_STALE, "corpus_hash_mismatch")

    dense = retrieval.DenseResources(loader=loader, embedder=fake_embedder(dimensions=DIMS))
    with caplog.at_level(logging.WARNING, logger="retrieval"):
        for _ in range(5):
            _hybrid("Tell me about ReelSensei", dense=dense)
    assert calls == [1]
    assert caplog.text.count("Vector index not served (stale: corpus_hash_mismatch)") == 1


def test_a_loader_that_raises_degrades_to_bm25():
    dense = retrieval.DenseResources(loader=lambda _k: raiser(OSError("x"))(), embedder=fake_embedder(dimensions=DIMS))
    result = _hybrid("Tell me about ReelSensei gaming", dense=dense)
    assert result.selection == retrieval.retrieve("Tell me about ReelSensei gaming", TOY).selection
    assert result.dense.status == retrieval.DENSE_ERROR and result.dense.error.startswith("OSError at ")


def test_an_embedder_for_another_model_is_never_scored_against_the_index():
    dense, client = _toy()
    other = retrieval.DenseResources(loader=dense.loader, embedder=fake_embedder(client, model="other", dimensions=DIMS))
    result = _hybrid("Have you published evaluations?", dense=other)
    assert result.dense.status == DENSE_MODEL_MISMATCH and result.outcome == CORE_ONLY
    assert client.models.calls == []


def test_a_greeting_never_calls_the_embedder():
    dense, client = _toy()
    result = _hybrid("hi there", dense=dense)
    assert result.outcome == CONVERSATIONAL and result.dense is None
    assert client.models.calls == []


def test_a_follow_up_embeds_the_framed_history():
    dense, client = _toy()
    history = ["What have you written about evaluations?", "Two posts."]
    result = _hybrid("and?", dense=dense, history=history)
    assert result.framed_from_history and result.outcome == NARROWED
    assert client.models.calls[0]["texts"] == [embedding.normalise_query("\n".join(history))]


def test_a_repeated_question_is_one_embedding_call():
    dense, client = _toy()
    for _ in range(4):
        _hybrid("Have you published evaluations?", dense=dense)
    assert len(client.models.calls) == 1


# --- logging ----------------------------------------------------------------------------


def _retrieval_records(caplog):
    return [
        json.loads(r.getMessage().split("Retrieval: ", 1)[1])
        for r in caplog.records
        if r.getMessage().startswith("Retrieval: ")
    ]


def test_one_json_line_per_request_with_the_dense_report_and_no_visitor_text(caplog):
    dense, _ = _toy()
    question = "Have you published evaluations, Moonsite friend?"
    with caplog.at_level(logging.INFO, logger="retrieval"):
        _hybrid(question, dense=dense)
    records = _retrieval_records(caplog)
    assert len(records) == 1
    record = records[0]
    assert record["mode"] == "hybrid"
    assert set(record["dense"]) == {"status", "index_status", "index_reason", "cache", "embed_ms", "model", "qualified"}
    assert {"cosine", "rrf", "bm25", "coverage"} <= set(record["chunks_sent"][0])
    for word in ("published", "evaluations", "friend", "evaluat", "publish"):
        assert word not in caplog.text


def test_lexical_mode_log_lines_are_unchanged_by_r2(caplog):
    with caplog.at_level(logging.INFO, logger="retrieval"):
        retrieval.retrieve("Tell me about ReelSensei gaming", TOY)
    record = _retrieval_records(caplog)[0]
    assert "dense" not in record and record["mode"] == "lexical"
    assert set(record["chunks_sent"][0]) == {"chunk_id", "doc_label", "chunk_index", "bm25", "coverage"}


# --- the flag ------------------------------------------------------------------------------


def _questions():
    return json.loads((HERE / "retrieval_eval" / "questions.v1.json").read_text(encoding="utf-8"))["questions"]


def test_hybrid_is_a_recognised_mode(monkeypatch):
    monkeypatch.setenv(retrieval.MODE_ENV, "hybrid")
    assert retrieval.configured_mode() == MODE_HYBRID


def test_the_default_is_still_todays_selector(monkeypatch):
    monkeypatch.delenv(retrieval.MODE_ENV, raising=False)
    assert retrieval.configured_mode() == retrieval.DEFAULT_MODE == retrieval.MODE_SELECTION


def test_hybrid_mode_without_a_committed_index_serves_the_lexical_result(monkeypatch, fresh_corpus_cache):
    """Today's state: no real index exists, so the flag changes nothing but the log."""
    assert not Path(vector_index.INDEX_PATH).exists()
    knowledge = context.get_knowledge()
    monkeypatch.setenv(retrieval.MODE_ENV, "hybrid")
    for case in _questions():
        assert retrieval.select(case["question"], knowledge) == retrieval.retrieve(case["question"], knowledge).selection


def test_the_email_only_shortcut_never_calls_retrieval_in_hybrid_mode(monkeypatch):
    def forbidden(*_args, **_kwargs):
        raise AssertionError("retrieval must not run for an email-only message")

    async def delivered(email, message_content, context_label):
        return {"response": "ok", "is_email_collection": True}

    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-key-not-real")
    monkeypatch.setattr(main, "enforce_rate_limit", lambda *a, **k: None)
    monkeypatch.setattr(main, "select", forbidden)
    monkeypatch.setattr(main, "_deliver_collected_email", delivered)
    monkeypatch.setenv(retrieval.MODE_ENV, "hybrid")

    response = TestClient(main.app).post("/chat-with-files", json={"message": "visitor@example.com"})
    assert response.status_code == 200


def test_the_committed_corpus_runs_end_to_end_on_a_fake_index(fresh_corpus_cache):
    knowledge = context.get_knowledge()
    dense = committed_corpus_dense(knowledge, fake_embedder(dimensions=64))
    for case in _questions():
        result = _hybrid(case["question"], knowledge, dense)
        assert result.outcome in (NARROWED, CORE_ONLY, CONVERSATIONAL)
        assert result.selection.knowledge.sources[:2] == ("Profile / about-me", "Profile / resume")
        if result.outcome != CONVERSATIONAL:
            assert result.dense.status == DENSE_OK and result.dense.index_status == vector_index.LOAD_OK
    assert dense.loader.calls == 1


# --- latency (plan sections 6.2 and 9.3) ------------------------------------------------------


def _p95(values):
    return statistics.quantiles(values, n=20)[-1]


def test_hybrid_in_process_steps_stay_inside_the_latency_budget(fresh_corpus_cache):
    """Cache hit or keyword-only: end to end p95 <= 15 ms; cosine p95 <= 5 ms; LRU hit p95 <= 1 ms.

    768-dimension fake vectors over the committed corpus, so the cosine loop
    is the production size. The embedding call itself is a cache hit here;
    a cache miss is network-bound and is measured only against the real API.
    """
    knowledge = context.get_knowledge()
    embedder = fake_embedder(dimensions=embedding.DIMENSIONS)
    dense = committed_corpus_dense(knowledge, embedder)
    questions = [case["question"] for case in _questions()]
    for question in questions:  # warm the LRU and the index
        _hybrid(question, knowledge, dense)

    total, dense_step, hits = [], [], []
    for question in questions:
        for _ in range(5):
            started = time.perf_counter()
            result = _hybrid(question, knowledge, dense)
            total.append((time.perf_counter() - started) * 1000.0)
            if "dense" in result.timings_ms:
                dense_step.append(result.timings_ms["dense"])
                hits.append(result.dense.embed_ms)
                assert result.dense.cache == embedding.CACHE_HIT
    assert _p95(total) <= 15.0
    assert _p95(dense_step) <= 5.0
    assert _p95(hits) <= 1.0
