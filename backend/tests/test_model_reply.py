"""The shape the model answers in, and what the site does with each part.

No network: the upstream call is stubbed. What is pinned here is that the
structured reply is asked for, read deterministically whatever comes back, and
that only the model's own words are signed for replay as history.
"""

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import gemini_helper
import main
from routes import chat as chat_route
import rate_limit
import settings
import prompt
from gemini_helper import Answer, Handoff, _parse_reply
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
    assert _parse_reply('{"answer": "I built it.", "declined": false}') == ("I built it.", False, None, ())


def test_plain_text_is_the_answer_with_the_flag_unknown():
    assert _parse_reply("  I built it.  ") == ("I built it.", None, None, ())


def test_broken_json_never_shows_a_brace():
    # Cut short mid-object: the answer field is still readable.
    assert _parse_reply('{"answer": "I built \\"it\\".", "decl') == ('I built "it".', None, None, ())
    # Nothing readable: empty, which the caller turns into its own copy.
    assert _parse_reply('{"answ') == ("", None, None, ())


_READY = {
    "ready": True,
    "reason": "pricing",
    "situation": "I run a small accounting office.",
    "pain": "Client intake email eats our mornings.",
    "goal": "I want to know what an intake agent costs.",
    "fit": "I build agents that sort and answer incoming requests.",
}
_SUMMARY = "I run a small accounting office. Client intake email eats our mornings. I want to know what an intake agent costs."


def test_a_ready_handoff_is_read_beside_the_answer():
    text, declined, handoff, _ = _parse_reply(
        json.dumps({"answer": "It depends.", "declined": False, "handoff": _READY})
    )

    assert (text, declined) == ("It depends.", False)
    assert handoff.ready and handoff.reason == "pricing"
    assert handoff.summary == _SUMMARY
    assert handoff.fit == _READY["fit"]


def test_a_broken_handoff_only_drops_the_handoff():
    for broken in ({"ready": "yes"}, dict(_READY, reason="bribe"), "ready", None):
        text, declined, handoff, _ = _parse_reply(
            json.dumps({"answer": "A.", "declined": False, "handoff": broken})
        )
        assert (text, declined, handoff) == ("A.", False, None)


_LONG_HE = (
    "יש לנו משרד רואי חשבון עם שמונה עובדים. "
    "כל בוקר מישהו מבזבז שעתיים על מיון מיילים מלקוחות, העברת מסמכים לתיקים ומענה על אותן שאלות שוב ושוב, "
    "וזה פשוט לא נגמר, גם בעונת הדוחות וגם מחוץ לה."
)
_LONG_EN = (
    "We run an accounting office with eight people. "
    "Every morning someone spends two hours sorting client email, filing documents and answering "
    "the same questions over and over, and it never ends."
)


def _part(**fields):
    _, _, handoff, _ = _parse_reply(
        json.dumps({"answer": "A.", "declined": False, "handoff": dict(_READY, **fields)})
    )
    return handoff


@pytest.mark.parametrize("long, first", [
    (_LONG_HE, "יש לנו משרד רואי חשבון עם שמונה עובדים."),
    (_LONG_EN, "We run an accounting office with eight people."),
])
def test_a_long_part_keeps_only_whole_sentences(long, first):
    assert _part(pain=long).pain == first


def test_a_part_whose_first_sentence_is_too_long_is_dropped_not_sliced():
    one_sentence = "word " * 60 + "end."

    assert _part(pain=one_sentence).pain == ""
    assert _part(fit=one_sentence).fit == ""


def test_parts_within_the_limit_are_never_touched():
    for text in ("יש לי מספרה עם שני סניפים", "We get a lot of WhatsApp messages about appointments."):
        assert _part(pain=text).pain == text


def test_a_long_summary_never_ends_mid_sentence(answer_with):
    answer_with(_ready_answer(handoff=_part(situation=_LONG_EN, pain=_LONG_HE, goal=_LONG_EN)))

    summary = _ask("What would it cost?", conversation_history=_two_earlier_turns())["handoff"]["summary"]

    assert summary.endswith(".") and "…" not in summary


@pytest.mark.parametrize("fit", ["I can build this in 2 weeks.", "It costs about ₪5,000.", "Saves 40% of the time."])
def test_a_fit_line_with_a_figure_is_dropped(fit):
    _, _, handoff, _ = _parse_reply(
        json.dumps({"answer": "A.", "declined": False, "handoff": dict(_READY, fit=fit)})
    )

    assert handoff.fit == "" and handoff.pain


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
    monkeypatch.setattr(settings, "ORIGIN_SHARED_SECRET", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        rate_limit, "chat_limiter", SlidingWindowLimiter(per_key_limit=50, global_limit=50)
    )

    def install(answer):
        monkeypatch.setattr(chat_route, "get_gemini_response", lambda *a, **k: answer)

    return install


def _ask(message="What is ReelSensei?", **extra):
    response = TestClient(main.app).post(
        "/chat-with-files", json={"message": message, **extra}
    )
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


# --- offering a direct talk ------------------------------------------------------


def _ready_answer(**changes):
    fields = dict(text="It depends on the volume.", model="m", declined=False, handoff=Handoff(**_READY))
    fields.update(changes)
    return Answer(**fields)


def _two_earlier_turns():
    return [
        {"type": "user", "content": "I run an accounting office."},
        {"type": "assistant", "content": "Tell me more."},
        {"type": "user", "content": "Intake email eats our mornings."},
    ]


def test_the_card_is_offered_from_the_third_visitor_message(answer_with):
    answer_with(_ready_answer())

    reply = _ask("What would it cost?", conversation_history=_two_earlier_turns())

    assert reply["handoff"] == {"reason": "pricing", "summary": _SUMMARY, "fit": _READY["fit"]}
    # The answer itself is untouched and still replayable.
    assert reply["response"] == "It depends on the volume." and reply["sig"]


def test_the_card_waits_for_a_conversation(answer_with):
    answer_with(_ready_answer())

    assert _ask("What would it cost?").get("handoff") is None
    assert _ask("What would it cost?", conversation_history=_two_earlier_turns()[:1]).get("handoff") is None


def test_the_card_is_offered_once_per_conversation(answer_with):
    answer_with(_ready_answer())

    reply = _ask("And timing?", conversation_history=_two_earlier_turns(), handoff_offered=True)

    assert reply.get("handoff") is None


@pytest.mark.parametrize(
    "changes",
    [
        {"declined": True},
        {"handoff": Handoff(**dict(_READY, ready=False))},
        {"handoff": Handoff(**dict(_READY, reason="none"))},
        # Ready, but no problem in the recap.
        {"handoff": Handoff(**dict(_READY, pain=""))},
        {"handoff": None},
        {"text": gemini_helper.TRUNCATED_RESPONSE_MESSAGE, "fallback": True},
    ],
)
def test_the_model_judges_but_the_server_decides(answer_with, changes):
    answer_with(_ready_answer(**changes))

    reply = _ask("What would it cost?", conversation_history=_two_earlier_turns())

    assert reply.get("handoff") is None


def test_the_last_answer_of_the_day_offers_the_way_to_keep_going(answer_with, monkeypatch):
    monkeypatch.setattr(
        rate_limit, "chat_limiter", SlidingWindowLimiter(per_key_limit=1, global_limit=50)
    )
    answer_with(_ready_answer(handoff=Handoff(**dict(_READY, ready=False, reason="none"))))

    # A first question, but the visitor's only one today.
    reply = _ask("What is ReelSensei?")

    assert reply["handoff"] == {"reason": "last_answer", "summary": "", "fit": ""}


def test_the_last_answer_still_respects_a_decline(answer_with, monkeypatch):
    monkeypatch.setattr(
        rate_limit, "chat_limiter", SlidingWindowLimiter(per_key_limit=1, global_limit=50)
    )
    answer_with(_ready_answer(declined=True))

    assert _ask().get("handoff") is None


def test_remaining_counts_down_without_spending():
    limiter = SlidingWindowLimiter(per_key_limit=2, global_limit=50)

    assert limiter.remaining("a") == 2
    limiter.check("a")
    assert limiter.remaining("a") == limiter.remaining("a") == 1
    limiter.check("a")
    assert limiter.remaining("a") == 0 and limiter.remaining("b") == 2
