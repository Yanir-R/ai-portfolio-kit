"""The R1 lexical retriever: BM25, the core-only miss path, grouping, and its audit trail.

Like selection, retrieval fails silently by construction - a dropped chunk
reads as an honest decline - so these tests pin both directions: it narrows,
and it never loses the document a question names. On top of that they pin
what R1 adds: a miss sends the core and never everything, a failure degrades
to the core with the reason logged, and the log line never carries the
visitor's words.
"""

import json
import logging
import math
import statistics
import time
from pathlib import Path

import pytest
from starlette.testclient import TestClient

import context
import main
import retrieval
import selection
from context import Knowledge, Section
from retrieval import (
    CORE_ONLY,
    GAP_MARKER,
    REASON_BELOW_COVERAGE_GATE,
    REASON_NO_CORPUS,
    REASON_NO_TERM_IN_INDEX,
    REASON_NO_TOPICAL_TERMS,
    REASON_PASSED_GATE,
    REASON_RETRIEVAL_ERROR,
)
from selection import CONVERSATIONAL, NARROWED, NO_CORPUS

CORE = ("Profile / about-me", "Profile / resume")


def _corpus(*pairs) -> Knowledge:
    return Knowledge(sections=tuple(Section(label=label, body=body) for label, body in pairs))


PROFILE = (
    ("Profile / about-me", "I build AI products end to end and then try to break them."),
    ("Profile / resume", "Moonsite, full stack developer, sports betting platform."),
)

SAMPLE = _corpus(
    *PROFILE,
    ("Project / ReelSensei", "A gaming highlights tool, paused, built with Python."),
    ("Writing / Cursor tokens", "Cursor burned 22.7 million tokens in one session."),
    ("Writing / Nothing found", "Agent tool calls returning nothing, and the three meanings."),
)


def _labels(result) -> tuple:
    return result.selection.knowledge.sources


# --- BM25 ----------------------------------------------------------------------


def test_bm25_matches_the_okapi_formula_on_a_toy_corpus():
    knowledge = _corpus(*PROFILE, ("Project / A", "apple apple banana"), ("Project / B", "banana cherry"))
    hits = {h.chunk.doc_label: h.bm25 for h in retrieval.retrieve("apple", knowledge).candidates}

    # Chunk A indexes "project apple apple banana" (4 terms), B "project banana cherry" (3).
    k1, b, average = retrieval.BM25_K1, retrieval.BM25_B, 3.5
    idf = math.log(1 + (2 - 1 + 0.5) / (1 + 0.5))
    expected = idf * 2 * (k1 + 1) / (2 + k1 * (1 - b + b * 4 / average))
    assert hits == {"Project / A": pytest.approx(expected)}


def test_ranking_is_deterministic_and_ties_follow_corpus_order():
    knowledge = _corpus(*PROFILE, ("Writing / First", "zebrafish notes"), ("Writing / Second", "zebrafish notes"))
    runs = [[h.chunk.chunk_id for h in retrieval.retrieve("zebrafish", knowledge).candidates] for _ in range(3)]
    assert runs[0] == runs[1] == runs[2]
    order = [h.chunk.doc_label for h in retrieval.retrieve("zebrafish", knowledge).candidates]
    assert order == ["Writing / First", "Writing / Second"]


# --- outcomes ------------------------------------------------------------------


def test_a_question_about_one_post_narrows_to_it():
    result = retrieval.retrieve("How many tokens did Cursor burn?", SAMPLE)
    assert result.outcome == NARROWED and result.reason == REASON_PASSED_GATE
    assert _labels(result) == CORE + ("Writing / Cursor tokens",)


def test_a_subject_the_corpus_has_no_words_for_gets_the_core_not_everything():
    result = retrieval.retrieve("Tell me about quantum annealing", SAMPLE)
    assert result.outcome == CORE_ONLY and result.reason == REASON_NO_TERM_IN_INDEX
    assert _labels(result) == CORE


def test_one_stray_known_word_among_unknown_ones_stays_a_miss():
    result = retrieval.retrieve("quantum annealing schedules for python lattices", SAMPLE)
    assert result.outcome == CORE_ONLY and result.reason == REASON_BELOW_COVERAGE_GATE
    assert result.words.unknown >= 3 and result.words.matched == 1


def test_a_question_the_core_answers_does_not_reach_for_a_post():
    result = retrieval.retrieve("What did you do at Moonsite?", SAMPLE)
    assert result.outcome == CORE_ONLY and result.words.core == 1
    assert _labels(result) == CORE


def test_a_greeting_is_conversational():
    result = retrieval.retrieve("hi there, thanks!", SAMPLE)
    assert result.outcome == CONVERSATIONAL and result.reason == REASON_NO_TOPICAL_TERMS
    assert _labels(result) == CORE


def test_a_follow_up_is_framed_by_the_conversation():
    result = retrieval.retrieve("and the second one?", SAMPLE, history=["Tell me about the Cursor session tokens"])
    assert result.outcome == NARROWED and result.framed_from_history
    assert "Writing / Cursor tokens" in _labels(result)


def test_an_empty_corpus_is_reported_as_its_own_condition():
    result = retrieval.retrieve("anything", Knowledge(sections=()))
    assert result.outcome == NO_CORPUS and result.reason == REASON_NO_CORPUS
    assert result.selection.available == 0


def test_profile_is_always_present_and_first():
    for question in ("ReelSensei", "quantum", "hi", "Cursor tokens and nothing found"):
        assert _labels(retrieval.retrieve(question, SAMPLE))[:2] == CORE


def test_available_counts_the_whole_corpus():
    assert retrieval.retrieve("ReelSensei", SAMPLE).selection.available == len(SAMPLE.sections)


# --- budget and grouping ---------------------------------------------------------


def _long_doc() -> tuple:
    parts = [f"## Part {i}\n\n" + ("filler words here " * 60) + f"marker{i}\n\n" for i in range(6)]
    return ("Project / Long", "# Long\n\n" + "".join(parts))


def test_budget_and_top_k_cut_in_rank_order(monkeypatch):
    knowledge = _corpus(*PROFILE, _long_doc())
    monkeypatch.setattr(retrieval, "WHOLE_DOC_TOKENS", 0)
    monkeypatch.setattr(retrieval, "TOP_K_MAX", 1)
    result = retrieval.retrieve("filler", knowledge)
    assert len(result.sent) == 1 and result.sent[0] == result.candidates[0]
    assert result.retrieved_tokens == result.sent[0].chunk.token_estimate

    monkeypatch.setattr(retrieval, "TOP_K_MAX", 12)
    monkeypatch.setattr(retrieval, "RETRIEVAL_TOKEN_BUDGET", result.sent[0].chunk.token_estimate)
    assert len(retrieval.retrieve("filler", knowledge).sent) == 1


def test_grouping_keeps_the_label_and_order_and_marks_gaps(monkeypatch):
    knowledge = _corpus(*PROFILE, _long_doc())
    doc = knowledge.sections[-1]
    monkeypatch.setattr(retrieval, "WHOLE_DOC_TOKENS", 0)
    result = retrieval.retrieve("marker4 marker1", knowledge)
    sent = sorted(h.chunk.chunk_index for h in result.sent)
    (section,) = [s for s in result.selection.knowledge.sections if not s.is_profile]

    assert section.label == "Project / Long"
    assert len(sent) == 2 and sent[1] - sent[0] > 1
    assert section.body.index("marker1") < section.body.index(GAP_MARKER, section.body.index("marker1"))
    assert section.body.index("marker1") < section.body.index("marker4")
    # Every non-marker part is a verbatim slice of the original document.
    for part in section.body.split(GAP_MARKER):
        assert part.strip() in doc.body


def test_grouped_output_keeps_source_counts_per_document(monkeypatch):
    monkeypatch.setattr(retrieval, "WHOLE_DOC_TOKENS", 0)
    result = retrieval.retrieve("marker4 marker1", _corpus(*PROFILE, _long_doc()))
    assert result.selection.knowledge.source_counts == (("note", 2), ("project write-up", 1))


def test_a_short_document_is_sent_whole():
    result = retrieval.retrieve("ReelSensei", SAMPLE)
    (section,) = [s for s in result.selection.knowledge.sections if s.label == "Project / ReelSensei"]
    assert section.body == SAMPLE.sections[2].body


# --- reliability and audit -------------------------------------------------------


def test_a_failure_degrades_to_the_core_and_logs_why_without_the_question(monkeypatch, caplog):
    def explode(*_args, **_kwargs):
        raise KeyError("zebrafishsecret")

    monkeypatch.setattr(retrieval, "_bm25", explode)
    with caplog.at_level(logging.INFO, logger="retrieval"):
        result = retrieval.retrieve("Cursor zebrafishsecret tokens", SAMPLE)

    assert result.outcome == CORE_ONLY and result.reason == REASON_RETRIEVAL_ERROR
    assert result.error == "KeyError" and _labels(result) == CORE
    assert "KeyError" in caplog.text and "retrieval.py:" in caplog.text
    assert "zebrafishsecret" not in caplog.text


def test_the_audit_line_is_structured_and_carries_no_visitor_words(caplog):
    with caplog.at_level(logging.INFO, logger="retrieval"):
        retrieval.retrieve("How many tokens did Cursor burn in that session?", SAMPLE)
    (line,) = [r.getMessage() for r in caplog.records if r.getMessage().startswith("Retrieval: ")]
    record = json.loads(line[len("Retrieval: "):])

    assert record["mode"] == "lexical" and record["outcome"] == NARROWED
    assert record["reason"] == REASON_PASSED_GATE
    assert record["docs_sent"] == list(CORE) + ["Writing / Cursor tokens"]
    assert {"chunk_id", "doc_label", "chunk_index", "bm25", "coverage"} <= set(record["chunks_sent"][0])
    assert {"analyze", "index", "score", "assemble", "total"} <= set(record["timings_ms"])
    assert record["token_estimate"] > 0 and record["words"]["total"] >= 3
    for word in ("many", "burn", "session", "how"):
        assert word not in line.lower().replace("cursor tokens", "")


# --- Hebrew, end to end (toy corpus: the committed one has no Hebrew) -------------


HEBREW = _corpus(
    *PROFILE,
    ("Writing / Agents", "כתבתי על סוכנים ועל הפרויקטים שלי בפייתון."),
    ("Writing / Video", "סטרימינג של משחקים וקליפים קצרים."),
    ("Project / ReelSensei", "Gaming highlights for streamers."),
)


@pytest.mark.parametrize(
    "question",
    [
        "ספר לי על והפרויקטים שלך",  # stacked prefix + plural
        "כשכתבת על הסוכן",  # two-letter prefix, singular against plural
        "מה כָּתַבְתָּ על סוכנים?",  # niqqud
        "תספר על פיתון",  # spelling variant: trigram fallback
    ],
)
def test_hebrew_questions_reach_hebrew_text(question):
    result = retrieval.retrieve(question, HEBREW)
    assert result.outcome == NARROWED
    assert "Writing / Agents" in _labels(result) and "Writing / Video" not in _labels(result)


def test_the_trigram_fallback_is_counted():
    assert retrieval.retrieve("תספר על פיתון", HEBREW).words.trigram == 1


def test_mixed_question_uses_the_latin_name_beside_hebrew():
    result = retrieval.retrieve("מה זה ReelSensei?", HEBREW)
    assert result.outcome == NARROWED and "Project / ReelSensei" in _labels(result)


def test_hebrew_words_do_not_veto_a_latin_name_in_an_english_corpus():
    result = retrieval.retrieve("תספר על ReelSensei, האם אפשר להירשם?", SAMPLE)
    assert result.outcome == NARROWED and "Project / ReelSensei" in _labels(result)
    assert result.words.other_script >= 1


def test_a_hebrew_only_question_over_english_text_gets_the_core():
    result = retrieval.retrieve("מה כתבת על כשלי הכלים של סוכנים?", SAMPLE)
    assert result.outcome == CORE_ONLY and _labels(result) == CORE


# --- the committed corpus ------------------------------------------------------------


def test_a_trailing_period_no_longer_sends_everything(fresh_corpus_cache):
    result = retrieval.retrieve("Tell me about ReelSensei.", context.get_knowledge())
    assert result.outcome == NARROWED
    assert [l for l in _labels(result) if l not in CORE] == ["Project / ReelSensei - AI Gaming Highlights"]


def test_the_motivating_paraphrase_is_an_honest_core_only_miss(fresh_corpus_cache):
    # Lexical retrieval cannot know "evals"; the dense leg (R2) is for this.
    result = retrieval.retrieve("What have you written about evals?", context.get_knowledge())
    assert result.outcome == CORE_ONLY and _labels(result) == CORE


def test_lexical_retrieval_stays_inside_the_latency_budget(fresh_corpus_cache):
    """Plan section 6.2: in-process retrieval p95 <= 15 ms (keyword-only)."""
    knowledge = context.get_knowledge()
    questions = json.loads(
        (Path(__file__).parent / "retrieval_eval" / "questions.v1.json").read_text(encoding="utf-8")
    )["questions"]
    retrieval.retrieve("warm up the index", knowledge)
    times = []
    for case in questions:
        for _ in range(5):
            started = time.perf_counter()
            retrieval.retrieve(case["question"], knowledge)
            times.append((time.perf_counter() - started) * 1000.0)
    assert statistics.quantiles(times, n=20)[-1] <= 15.0


# --- the flag ------------------------------------------------------------------------


def test_the_default_mode_is_todays_selector(monkeypatch, fresh_corpus_cache):
    monkeypatch.delenv(retrieval.MODE_ENV, raising=False)
    knowledge = context.get_knowledge()
    for question in ("Tell me about ReelSensei.", "hi", "What have you written about evals?"):
        assert retrieval.select(question, knowledge) == selection.select(question, knowledge)


def test_lexical_mode_serves_the_retriever(monkeypatch):
    monkeypatch.setenv(retrieval.MODE_ENV, "lexical")
    assert retrieval.select("quantum annealing", SAMPLE).outcome == CORE_ONLY


def test_an_unknown_mode_falls_back_to_the_default_and_warns_once(monkeypatch, caplog):
    monkeypatch.setenv(retrieval.MODE_ENV, "hybird")
    monkeypatch.setattr(retrieval, "_warned_modes", set())
    with caplog.at_level(logging.WARNING, logger="retrieval"):
        first = retrieval.select("quantum annealing", SAMPLE)
        retrieval.select("quantum annealing", SAMPLE)
    assert first == selection.select("quantum annealing", SAMPLE)
    assert caplog.text.count("is not one of") == 1


def test_the_email_only_shortcut_never_calls_retrieval(monkeypatch):
    def forbidden(*_args, **_kwargs):
        raise AssertionError("retrieval must not run for an email-only message")

    async def delivered(email, message_content, context_label):
        return {"response": "ok", "is_email_collection": True}

    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-key-not-real")
    monkeypatch.setattr(main, "enforce_rate_limit", lambda *a, **k: None)
    monkeypatch.setattr(main, "select", forbidden)
    monkeypatch.setattr(main, "_deliver_collected_email", delivered)
    monkeypatch.setenv(retrieval.MODE_ENV, "lexical")

    response = TestClient(main.app).post("/chat-with-files", json={"message": "visitor@example.com"})
    assert response.status_code == 200
