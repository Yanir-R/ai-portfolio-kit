"""Cards beside an answer that was not about the writing.

Search proposes the pieces; the model says which ones the answer drew on; only
pieces on both lists are shown. Reproduces the live case that prompted this: a
price question showing a post about reviewing pull requests.
"""

import pytest
from fastapi.testclient import TestClient

import main
from gemini_helper import Answer
from rate_limit import SlidingWindowLimiter


@pytest.fixture
def model(monkeypatch):
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        main, "chat_limiter", SlidingWindowLimiter(per_key_limit=50, global_limit=50)
    )

    def install(**fields):
        sent = []

        def answer(key, question, knowledge, *a, **k):
            sent.extend(s for s in knowledge.sections if s.source == "writing")
            return Answer(text="An answer.", model="test", **fields)

        monkeypatch.setattr(main, "get_gemini_response", answer)
        return sent

    return install


def _cards(message):
    reply = TestClient(main.app).post("/chat-with-files", json={"message": message}).json()
    return [b for b in reply["blocks"] if b["type"].startswith("writing")]


PRICE = "וכמה דבר כזה עולה?"


def test_a_price_question_shows_no_post_the_answer_did_not_use(model):
    model(used=())
    assert _cards(PRICE) == []


def test_without_the_models_word_no_related_card_is_shown(model):
    # Plain-text reply, or structured output switched off.
    model()
    assert _cards(PRICE) == []


def test_a_cited_piece_that_search_sent_is_shown(model):
    sent = model()
    _cards("What do you think about agents asking for approval?")
    title = next(s.title for s in sent if s.slug == "agents-ask-approval")

    model(used=(title.upper(),))
    cards = _cards("What do you think about agents asking for approval?")

    assert [c["ref"] for c in cards] == ["agents-ask-approval"]


def test_an_invented_title_matches_nothing(model):
    model(used=("A Post That Does Not Exist",))
    assert _cards("What do you think about agents asking for approval?") == []


def test_a_declined_answer_carries_no_card(model):
    sent = model()
    _cards("What do you think about agents asking for approval?")
    model(used=tuple(s.title for s in sent), declined=True)
    assert _cards("What do you think about agents asking for approval?") == []


def test_explicit_writing_questions_still_list_the_writing(model):
    # "What have you written about X" is answered by the list itself, whatever
    # the model cites.
    model(used=())
    cards = _cards("What have you written about AI memory?")
    assert cards and cards[0]["type"] == "writing_list"
