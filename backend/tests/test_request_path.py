"""Properties of the request path that hold whatever the model answers.

Each test pins one thing a visitor or an operator would notice if it broke:
the server staying responsive during a slow upstream call, the chat budget
being spent only on model calls, and the small refusals that must not turn
into a 500.
"""

import threading

import pytest
from starlette.testclient import TestClient

import docs_helper
import main
from gemini_helper import Answer
from rate_limit import SlidingWindowLimiter


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-key")
    return TestClient(main.app)


@pytest.fixture
def chat_budget(monkeypatch):
    """A fresh chat limiter that allows exactly one model answer."""
    limiter = SlidingWindowLimiter(per_key_limit=1, global_limit=1, window_seconds=60)
    monkeypatch.setattr(main, "chat_limiter", limiter)
    return limiter


@pytest.fixture
def contact_budget(monkeypatch):
    limiter = SlidingWindowLimiter(per_key_limit=50, global_limit=50)
    monkeypatch.setattr(main, "contact_limiter", limiter)
    return limiter


def _stub_model(monkeypatch, seen_threads=None):
    def answer(*args, **kwargs):
        if seen_threads is not None:
            seen_threads.append(threading.current_thread())
        return Answer(text="An answer.")

    monkeypatch.setattr(main, "get_gemini_response", answer)


def test_the_model_call_runs_off_the_event_loop(client, chat_budget, monkeypatch):
    """A synchronous SDK call on the event loop stalls every other request."""
    seen = []
    _stub_model(monkeypatch, seen)

    loop_thread = []

    @main.app.get("/_test/loop-thread")
    async def loop_thread_probe():
        loop_thread.append(threading.current_thread())
        return {}

    try:
        client.get("/_test/loop-thread")
        response = client.post("/chat-with-files", json={"message": "What is ReelSensei?"})
    finally:
        main.app.router.routes.pop()

    assert response.status_code == 200
    assert seen and loop_thread
    assert seen[0] is not loop_thread[0]


def test_replies_without_a_model_call_do_not_spend_the_chat_budget(
    client, chat_budget, contact_budget, monkeypatch
):
    _stub_model(monkeypatch)

    for _ in range(5):
        fixed = client.post("/chat-with-files", json={"message": "Can I hire you?"})
        assert fixed.status_code == 200
        assert fixed.json()["is_email_collection"] is True
        assert fixed.json()["trace"] is None

    first = client.post("/chat-with-files", json={"message": "What is ReelSensei?"})
    second = client.post("/chat-with-files", json={"message": "What is ReelSensei?"})

    assert first.status_code == 200
    assert second.status_code == 429


def test_the_recent_writing_list_does_not_spend_the_chat_budget(
    client, chat_budget, monkeypatch
):
    """The "what did you write lately" reply is a list from the index, not an
    answer from the model, so a run of them must leave the budget untouched."""
    _stub_model(monkeypatch)

    for _ in range(3):
        listed = client.post(
            "/chat-with-files", json={"message": "What did you post recently on LinkedIn?"}
        )
        assert listed.status_code == 200
        assert listed.json()["blocks"][0]["ref"] == "recent"

    answered = client.post("/chat-with-files", json={"message": "What is ReelSensei?"})
    assert answered.status_code == 200


def test_an_address_left_in_chat_spends_the_contact_budget(
    client, chat_budget, monkeypatch
):
    sent = []

    async def deliver(email, message):
        sent.append(email)

    monkeypatch.setattr(main, "_send_contact_email", deliver)
    monkeypatch.setattr(
        main, "contact_limiter", SlidingWindowLimiter(per_key_limit=1, global_limit=1)
    )

    first = client.post("/chat-with-files", json={"message": "visitor@example.com"})
    second = client.post("/chat-with-files", json={"message": "visitor@example.com"})

    assert first.status_code == 200 and first.json()["email_collected"] is True
    assert second.status_code == 429
    assert sent == ["visitor@example.com"]


def test_an_address_is_removed_from_the_message_as_it_was_typed(
    client, contact_budget, monkeypatch
):
    """Validation lower-cases the domain, so the typed form is what to strip."""
    delivered = []

    async def deliver(email, message):
        delivered.append((email, message))

    monkeypatch.setattr(main, "_send_contact_email", deliver)

    client.post(
        "/chat-with-files",
        json={
            "message": "John@EXAMPLE.org about an agent project",
            "conversation_history": [
                {"type": "ai", "content": "Leave your email.", "is_email_collection": True}
            ],
        },
    )

    assert delivered == [("John@example.org", "about an agent project")]


def test_validating_an_address_makes_no_network_call(monkeypatch):
    """The deliverability check is a DNS lookup; the request path skips it."""
    seen = {}

    def spy(candidate, **kwargs):
        seen.update(kwargs)
        return type("Validated", (), {"email": candidate})()

    monkeypatch.setattr(main, "validate_email", spy)

    main._validated_address("visitor@example.com")

    assert seen == {"check_deliverability": False}


def test_the_smtp_connection_has_a_timeout(monkeypatch):
    seen = {}

    class Server:
        def __init__(self, host, port, timeout=None):
            seen["timeout"] = timeout

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def login(self, *args):
            pass

        def send_message(self, msg):
            pass

    monkeypatch.setattr(main.smtplib, "SMTP_SSL", Server)

    main._smtp_send(main.MIMEMultipart(), "sender@example.com", "password")

    assert seen["timeout"] == main.SMTP_TIMEOUT_SECONDS


def test_a_missing_api_key_is_reported_without_naming_it(client, chat_budget, monkeypatch):
    monkeypatch.setattr(main, "GEMINI_API_KEY", None)

    response = client.post("/chat-with-files", json={"message": "What is ReelSensei?"})

    assert response.status_code == 500
    assert response.json() == {"detail": main.INTERNAL_ERROR_DETAIL}


def test_a_non_ascii_edge_secret_is_refused_not_an_error(monkeypatch):
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "the-real-secret")
    client = TestClient(main.app, raise_server_exceptions=False)

    response = client.get(
        "/api/chat/status", headers={"X-Edge-Auth": "café".encode("latin-1")}
    )

    assert response.status_code == 403


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
def test_the_api_schema_is_not_served(client, path):
    assert client.get(path).status_code == 404


def test_an_empty_contact_message_is_refused(client, monkeypatch):
    def explode(*args, **kwargs):
        raise AssertionError("delivery must not be attempted for an empty message")

    monkeypatch.setattr(main, "_send_contact_email", explode)

    response = client.post(
        "/api/contact", json={"email": "visitor@example.com", "message": ""}
    )

    assert response.status_code == 422


def test_projects_are_read_in_the_same_order_on_every_filesystem(monkeypatch, tmp_path):
    for name in ("b.md", "a.md", "c.md"):
        (tmp_path / name).write_text(f"# {name}\n\n## Overview\ntext\n")
    monkeypatch.setattr(docs_helper, "PROJECTS_DIR", str(tmp_path))
    monkeypatch.setattr(
        docs_helper.os, "listdir", lambda path: ["c.md", "a.md", "b.md"]
    )

    slugs = [project["slug"] for project in docs_helper.get_all_projects()]

    assert slugs == ["a", "b", "c"]
