"""Questions about Yanir's writing, and the cards that come back with them.

A question like "what have you written about memory?" names the form (writing)
and a subject (memory). Scored as one bag of words, the form words picked
whichever post happened to contain "post" or "article". These pin that the form
is read as a filter and the subject as the search, in both languages, and that
the answer carries the pieces as cards chosen by the server.
"""

import pytest
from starlette.testclient import TestClient

import context
import docs_helper
import main
from routes import chat as chat_route
import rate_limit
import settings
import selection
from gemini_helper import Answer
from rate_limit import SlidingWindowLimiter


@pytest.fixture(autouse=True)
def fresh_index():
    selection._reset_cache()
    yield
    selection._reset_cache()


def _ask(question, language="en"):
    return selection.select(question, context.get_knowledge(language))


def _sent_writing(chosen):
    return [d["slug"] for d in chosen.knowledge.documents if d["kind"] == "writing"]


@pytest.mark.parametrize(
    "language,question",
    [
        ("en", "What articles have you written?"),
        ("en", "Do you have a blog?"),
        ("he", "אילו מאמרים כתבת?"),
        ("he", "יש לך בלוג?"),
    ],
)
def test_asking_what_exists_lists_the_writing_without_sending_it(language, question):
    chosen = _ask(question, language)

    assert chosen.writing_intent == selection.WRITING_ALL
    assert chosen.writing_total == len(
        [s for s in context.get_knowledge(language).sections if s.source == "writing"]
    )
    assert len(chosen.writing) == selection.MAX_WRITING_ITEMS
    # Every piece is still named to the model, with its date, in one line.
    assert _sent_writing(chosen) == []
    assert any(s.summary.startswith("(20") for s in chosen.knowledge.listed if s.source == "writing")


@pytest.mark.parametrize(
    "language,question",
    [("en", "What did you post recently on LinkedIn?"), ("he", "מה הפוסט האחרון שלך?")],
)
def test_asking_for_the_latest_gets_the_newest_first(language, question):
    chosen = _ask(question, language)
    pieces = sorted(
        (s for s in context.get_knowledge(language).sections if s.source == "writing"),
        key=lambda s: s.date,
        reverse=True,
    )

    assert chosen.writing_intent == selection.WRITING_RECENT
    assert chosen.writing[0] == pieces[0].slug
    assert pieces[0].slug in _sent_writing(chosen)


@pytest.mark.parametrize(
    "language,question,expected",
    [
        ("en", "What have you written about AI memory?", "agent-memory-custody"),
        ("en", "Have you written anything about MCP?", "whatsapp-business-mcp"),
        ("en", "Did you write about tokens and cost?", "cursor-token-burn"),
        ("en", "Summarize the PersonaKit build series", "building-personakit-day-7"),
        ("en", "What was your article on the company blog about?", "three-meanings-of-nothing"),
        ("he", "מה כתבת על זיכרון של AI?", "personakit-memory-like-production"),
        ("he", "כתבת משהו על MCP?", "whatsapp-business-mcp"),
        ("he", "תראה לי פוסטים על סקירת קוד", "ninety-prs-review-engine"),
        ("he", "על מה המאמר שכתבת בבלוג של החברה?", "three-meanings-of-nothing"),
    ],
)
def test_a_subject_is_searched_among_the_writing_only(language, question, expected):
    chosen = _ask(question, language)

    assert chosen.writing_intent == selection.WRITING_TOPIC
    assert expected in chosen.writing
    assert all(d["kind"] != "project" for d in chosen.knowledge.documents)


def test_a_subject_the_writing_does_not_cover_falls_back_to_the_ordinary_search():
    chosen = _ask("Did you write the code for Trinity Legal?")

    assert chosen.writing_intent != selection.WRITING_TOPIC
    assert "trinity-legal" in [d["slug"] for d in chosen.knowledge.documents]


def test_someone_elses_writing_is_not_a_question_about_his():
    chosen = _ask("I was away and my agent wrote a lot. Do you have a way to recap that?")

    assert chosen.writing_intent not in (
        selection.WRITING_ALL, selection.WRITING_RECENT, selection.WRITING_TOPIC
    )


@pytest.mark.parametrize(
    "language,question",
    [
        ("en", "What do you think about agents asking for approval?"),
        ("he", "מה דעתך על סוכנים שמבקשים אישור?"),
    ],
)
def test_an_opinion_he_wrote_about_brings_the_post_as_evidence(language, question):
    chosen = _ask(question, language)

    assert chosen.writing_intent == selection.WRITING_RELATED
    assert chosen.writing[0] == "agents-ask-approval"
    assert len(chosen.writing) <= 2


TOPIC_IDS = {t["id"] for t in docs_helper.get_writing_index()["topics"]}


# --- the cards on the reply --------------------------------------------------


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "ORIGIN_SHARED_SECRET", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        rate_limit, "chat_limiter", SlidingWindowLimiter(per_key_limit=50, global_limit=50)
    )
    # The model cites every piece it was sent, so these tests see what search
    # chose; test_related_cards.py covers the model citing fewer.
    monkeypatch.setattr(
        chat_route, "get_gemini_response",
        lambda key, question, knowledge, *a, **k: Answer(
            text="An answer.",
            model="test",
            used=tuple(s.title for s in knowledge.sections if s.source == "writing"),
        ),
    )
    return TestClient(main.app)


def _blocks(client, message):
    response = client.post("/chat-with-files", json={"message": message, "conversation_history": []})
    assert response.status_code == 200
    return response.json()["blocks"]


def test_a_list_question_gets_one_list_card(client):
    blocks = _blocks(client, "What have you written about AI memory?")

    assert len(blocks) == 1
    assert blocks[0]["type"] == "writing_list"
    assert blocks[0]["ref"] == "topic"
    assert 1 < len(blocks[0]["items"]) <= 5
    assert blocks[0]["total"] >= len(blocks[0]["items"])


def test_an_opinion_gets_at_most_two_post_cards(client):
    blocks = _blocks(client, "What do you think about agents asking for approval?")

    assert 1 <= len(blocks) <= 2
    assert {b["type"] for b in blocks} == {"writing"}
    assert blocks[0]["ref"] == "agents-ask-approval"


def test_every_card_names_a_piece_that_exists(client):
    slugs = {s.slug for s in context.get_knowledge().sections if s.source == "writing"}
    for question in ("Do you have a blog?", "Your latest posts?", "Have you written about MCP?"):
        for block in _blocks(client, question):
            if block["type"] == "writing_topics":
                assert set(block["items"]) <= TOPIC_IDS
                continue
            assert set(block.get("items") or [block["ref"]]) <= slugs
            if block["type"] == "writing_list":
                assert set(block["items"]) <= slugs


def test_a_question_with_nothing_written_on_it_gets_no_cards(client):
    assert _blocks(client, "What is the weather in Tel Aviv?") == []
