"""The shape the model answers in, and what the site does with each part.

No network: the upstream call is stubbed. What is pinned here is that the
structured reply is asked for, read deterministically whatever comes back, and
that only the model's own words are signed for replay as history.
"""

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import gemini_helper
import main
import prompt
from gemini_helper import Answer, _parse_reply
from rate_limit import SlidingWindowLimiter


def _answered(text, cached=None):
    candidate = SimpleNamespace(finish_reason=SimpleNamespace(name="STOP"))
    usage = SimpleNamespace(
        prompt_token_count=100,
        thoughts_token_count=10,
        candidates_token_count=20,
        total_token_count=130,
        cached_content_token_count=cached,
    )
    return SimpleNamespace(text=text, candidates=[candidate], usage_metadata=usage)


# --- reading the reply -----------------------------------------------------------


def test_a_structured_reply_gives_both_fields():
    assert _parse_reply('{"answer": "I built it.", "declined": false}') == ("I built it.", False)


def test_plain_text_is_the_answer_with_the_flag_unknown():
    assert _parse_reply("  I built it.  ") == ("I built it.", None)


def test_broken_json_never_shows_a_brace():
    # Cut short mid-object: the answer field is still readable.
    assert _parse_reply('{"answer": "I built \\"it\\".", "decl') == ('I built "it".', None)
    # Nothing readable: empty, which the caller turns into its own copy.
    assert _parse_reply('{"answ') == ("", None)


# --- the request -----------------------------------------------------------------


def test_the_structured_shape_is_requested(stub_gemini, stub_knowledge):
    models = stub_gemini(_answered('{"answer": "A.", "declined": false}'))

    answer = gemini_helper.get_gemini_response("key", "q", stub_knowledge)

    config = models.configs[0]
    assert config.response_mime_type == "application/json"
    assert config.response_schema is gemini_helper.ModelReply
    assert answer.text == "A." and answer.declined is False


def test_the_retry_without_thinking_keeps_the_shape(stub_gemini, stub_knowledge):
    from tests.conftest import ApiError

    models = stub_gemini(ApiError(400), _answered('{"answer": "A.", "declined": true}'))

    answer = gemini_helper.get_gemini_response("key", "q", stub_knowledge)

    assert models.configs[1].response_schema is gemini_helper.ModelReply
    assert answer.declined is True


def test_the_cached_share_of_the_prompt_is_reported(stub_gemini, stub_knowledge):
    stub_gemini(_answered('{"answer": "A.", "declined": false}', cached=80))

    assert gemini_helper.get_gemini_response("key", "q", stub_knowledge).cached_tokens == 80


def test_an_empty_structured_answer_is_the_sites_own_copy(stub_gemini, stub_knowledge):
    stub_gemini(_answered('{"answer": "  ", "declined": false}'))

    answer = gemini_helper.get_gemini_response("key", "q", stub_knowledge)

    assert answer.text == gemini_helper.EMPTY_RESPONSE_MESSAGE
    assert answer.fallback and not answer.written_by_model


def test_the_reading_brief_follows_the_profile():
    from context import Knowledge, Section

    knowledge = Knowledge(sections=(Section(label="Profile / about-me", body="Facts."),))
    instruction = prompt.build_system_instruction(knowledge, "The visitor is reading X.")

    assert instruction.index("=== END PROFILE ===") < instruction.index("BEGIN READING")
    # Without a page, the instruction is exactly what it was, so the cached
    # prefix is the same for every visitor.
    assert "READING" not in prompt.build_system_instruction(knowledge)


# --- the endpoint ----------------------------------------------------------------


@pytest.fixture
def answer_with(monkeypatch):
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        main, "chat_limiter", SlidingWindowLimiter(per_key_limit=50, global_limit=50)
    )

    def install(answer):
        monkeypatch.setattr(main, "get_gemini_response", lambda *a, **k: answer)

    return install


def _ask(message="What is ReelSensei?"):
    response = TestClient(main.app).post("/chat-with-files", json={"message": message})
    assert response.status_code == 200, response.text
    return response.json()


def test_the_models_answer_is_signed_and_says_whether_it_declined(answer_with):
    answer_with(Answer(text="I haven't worked there.", model="m", declined=True, cached_tokens=900))

    reply = _ask()

    assert reply["sig"] and reply["declined"] is True
    assert reply["trace"]["cached_tokens"] == 900


def test_failure_copy_is_not_signed_so_it_is_never_replayed(answer_with):
    answer_with(Answer(text=gemini_helper.BUSY_MESSAGE))

    reply = _ask()

    assert reply["response"] == gemini_helper.BUSY_MESSAGE
    assert reply.get("sig") is None and reply.get("declined") is None


def test_a_cut_short_reply_is_not_signed_either(answer_with):
    answer_with(
        Answer(text=gemini_helper.TRUNCATED_RESPONSE_MESSAGE, model="m", fallback=True)
    )

    assert _ask().get("sig") is None
