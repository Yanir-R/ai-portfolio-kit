"""How the chat talks to Gemini: one client, a thinking level, and a way back
when a model refuses that level.

None of these reach the network. They pin the request shape, because a slow
answer and a wasted handshake both look like a working site from the outside.
"""

from types import SimpleNamespace

import gemini_helper
from tests.conftest import ApiError


def _answered(text="An answer."):
    candidate = SimpleNamespace(finish_reason=SimpleNamespace(name="STOP"))
    return SimpleNamespace(text=text, candidates=[candidate], usage_metadata=None)


def test_one_client_serves_every_request(monkeypatch, stub_knowledge):
    built = []

    def make_client(**kwargs):
        client = SimpleNamespace(
            models=SimpleNamespace(generate_content=lambda **kw: _answered())
        )
        built.append(client)
        return client

    monkeypatch.setattr(gemini_helper.genai, "Client", make_client)

    for _ in range(3):
        assert gemini_helper.get_gemini_response("key", "q", stub_knowledge).from_model

    assert len(built) == 1


def test_the_thinking_level_is_sent(stub_gemini, stub_knowledge):
    models = stub_gemini(_answered())

    gemini_helper.get_gemini_response("key", "q", stub_knowledge)

    sent = models.configs[0].thinking_config
    assert sent is not None
    assert sent.thinking_level == gemini_helper.THINKING_LEVEL


def test_a_model_that_refuses_the_level_is_asked_again_without_it(
    stub_gemini, stub_knowledge
):
    models = stub_gemini(ApiError(400), _answered("Still answered."))

    answer = gemini_helper.get_gemini_response("key", "q", stub_knowledge)

    assert answer.text == "Still answered."
    # Same model twice: the retry is about the setting, not the model.
    assert models.tried == [gemini_helper.MODELS[0]] * 2
    assert models.configs[1].thinking_config is None


def test_a_400_that_is_not_about_the_level_still_ends_the_chain(
    stub_gemini, stub_knowledge
):
    models = stub_gemini(ApiError(400), ApiError(400))

    answer = gemini_helper.get_gemini_response("key", "q", stub_knowledge)

    assert answer.text == gemini_helper.MISCONFIGURED_MESSAGE
    assert len(models.tried) == 2
