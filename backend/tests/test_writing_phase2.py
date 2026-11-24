"""The writing index and the chat behaviour built on it.

The index (docs/writing-index.json) holds what is curated rather than written:
topics from a closed list, a Hebrew one-liner per piece, verbatim quotes, dated
notes, media kinds and series. These pin that it stays consistent with the
pieces, and that the chat uses it: a series is one card, a follow-up does not
repeat what was shown, a question asked from a piece's page is about that piece,
and "your latest posts" is answered from the index without a model call.
"""

import pytest
from starlette.testclient import TestClient

import context
import docs_helper
import main
import selection
from gemini_helper import Answer
from rate_limit import SlidingWindowLimiter

INDEX = docs_helper.get_writing_index()
TOPIC_IDS = {topic["id"] for topic in INDEX["topics"]}
PIECES = {entry["slug"]: entry for entry in docs_helper.get_all_writing()}


@pytest.fixture(autouse=True)
def fresh_index():
    selection._reset_cache()
    yield
    selection._reset_cache()


# --- the index ---------------------------------------------------------------


def test_every_piece_has_topics_and_a_hebrew_summary():
    for slug, entry in PIECES.items():
        assert entry["topics"], slug
        assert set(entry["topics"]) <= TOPIC_IDS, slug
        assert entry.get("summary_he", "").strip(), slug


def test_the_index_names_only_pieces_that_exist():
    assert set(INDEX["pieces"]) <= set(PIECES)
    for series in INDEX["series"]:
        for part in series["parts"]:
            assert part["slug"] in PIECES


def test_a_quote_is_word_for_word_in_its_piece():
    for slug, entry in PIECES.items():
        if "quote" in entry:
            assert entry["quote"] in entry["content"], slug
            assert len(entry["quote"]) <= 200, slug


def test_media_have_a_kind_and_a_file(tmp_path):
    import os

    public = os.path.join(os.path.dirname(docs_helper.BASE_DIR), "frontend", "public")
    for slug, entry in PIECES.items():
        for item in entry["media_items"]:
            assert item["kind"] in {"image", "video", "clip"}, slug
            assert os.path.isfile(public + item["src"]), item["src"]
            if item["kind"] != "image":
                assert os.path.isfile(public + item["poster"]), item["poster"]


def test_a_series_part_knows_its_place():
    day_3 = PIECES["building-personakit-day-3"]["series"]
    assert day_3["id"] == "building-personakit"
    assert day_3["position"] == 3
    assert day_3["count"] == 9
    assert day_3["label_he"] == "יום 3"


def test_the_overview_counts_sources_and_topics():
    overview = docs_helper.writing_overview(list(PIECES.values()))
    assert overview["total"] == len(PIECES)
    assert sum(overview["sources"].values()) == len(PIECES)
    counts = [topic["count"] for topic in overview["topics"]]
    assert counts == sorted(counts, reverse=True)


# --- the chat ------------------------------------------------------------------


@pytest.fixture
def calls(monkeypatch):
    made = []

    def fake(*args, **kwargs):
        made.append(args)
        return Answer(text="An answer.", model="test")

    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        main, "chat_limiter", SlidingWindowLimiter(per_key_limit=50, global_limit=50)
    )
    monkeypatch.setattr(main, "get_gemini_response", fake)
    return made


def _post(message, **extra):
    client = TestClient(main.app)
    response = client.post(
        "/chat-with-files", json={"message": message, "conversation_history": [], **extra}
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_latest_posts_are_answered_from_the_index_without_a_model(calls):
    reply = _post("What are your latest posts?")
    assert calls == []
    assert reply["answered_by"] == "index"
    assert reply["trace"] is None
    assert reply["blocks"][0]["type"] == "writing_list"
    assert reply["blocks"][0]["ref"] == "recent"


def test_latest_posts_in_hebrew_get_a_hebrew_reply(calls):
    reply = _post("מה הפוסטים האחרונים שלך?")
    assert calls == []
    assert reply["response"] == main.RECENT_REPLY["he"]


def test_a_model_answer_says_so(calls):
    reply = _post("What have you written about AI memory?")
    assert len(calls) == 1
    assert reply["answered_by"] == "model"


def test_the_whole_blog_comes_with_its_topics(calls):
    blocks = _post("Do you have a blog?")["blocks"]
    assert [b["type"] for b in blocks] == ["writing_list", "writing_topics"]
    assert set(blocks[1]["items"]) <= TOPIC_IDS


def test_a_subject_never_written_about_offers_the_topics(calls):
    blocks = _post("Have you written about Kubernetes?")["blocks"]
    assert [b["type"] for b in blocks] == ["writing_topics"]


def test_a_project_question_carries_its_series_as_one_card(calls):
    blocks = _post("Tell me about PersonaKit")["blocks"]
    assert len(blocks) <= 2
    series = [b for b in blocks if b["type"] == "writing_series"]
    if series:
        assert series[0]["ref"] == "building-personakit"
    assert not any(b["type"] == "writing" for b in blocks) or not series


def test_the_build_log_question_gets_the_series(calls):
    blocks = _post("What did you write in the Building PersonaKit series?")["blocks"]
    assert blocks[0]["type"] in {"writing_series", "writing_list"}
    if blocks[0]["type"] == "writing_series":
        assert blocks[0]["ref"] == "building-personakit"


def test_a_question_from_a_piece_page_is_about_that_piece(calls):
    reply = _post(
        "So what does it actually do?",
        context={"type": "writing", "ref": "ninety-prs-review-engine"},
    )
    question, knowledge = calls[0][1], calls[0][2]
    assert "ninety-prs-review-engine" in {d["slug"] for d in knowledge.documents}
    # The model is told which piece "it" refers to, by the corpus's title.
    assert question.startswith('(Asked while reading your post "')
    assert question.endswith("So what does it actually do?")
    # The piece is open in front of the visitor, so it is not offered back.
    for block in reply["blocks"]:
        assert "ninety-prs-review-engine" not in (block.get("items") or [block["ref"]])


def test_an_unknown_context_is_ignored(calls):
    reply = _post("Hello", context={"type": "writing", "ref": "no-such-piece"})
    assert reply["blocks"] == []


def test_a_bad_context_is_refused(calls):
    client = TestClient(main.app)
    response = client.post(
        "/chat-with-files",
        json={"message": "Hi", "context": {"type": "writing", "ref": "../etc/passwd"}},
    )
    assert response.status_code == 422


def test_a_follow_up_does_not_show_the_same_piece_again(calls):
    first = _post("What do you think about Cursor token costs?")["blocks"]
    shown = [b["ref"] for b in first if b["type"] == "writing"]
    assert shown
    again = _post("What else did you write about that?", shown=shown)["blocks"]
    assert again
    for block in again:
        assert not set(block.get("items") or [block["ref"]]) & set(shown)


def test_a_follow_up_in_hebrew_continues_the_topic(calls):
    again = _post("ומה עוד כתבת על זה?", shown=["cursor-token-burn"])["blocks"]
    assert again
    assert "cursor-token-burn" not in (again[0].get("items") or [again[0]["ref"]])


def test_the_api_returns_the_overview():
    client = TestClient(main.app)
    data = client.get("/api/writing").json()
    assert data["overview"]["total"] == len(data["writing"])
    assert data["overview"]["series"][0]["id"] == "building-personakit"
