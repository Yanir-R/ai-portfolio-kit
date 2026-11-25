"""The site's own emails: Yanir's notification and the visitor's auto-reply.

What matters here is what each email may carry. The notification carries the
visitor's words, escaped, with replies going to the visitor. The auto-reply is
fixed text: nothing the visitor typed but their address reaches it, so the form
cannot be used to send someone else a message of the sender's choosing.
"""

from email import message_from_bytes
from email.header import decode_header, make_header

import pytest
from starlette.testclient import TestClient

import main
import site_mail
from tests.test_email_delivery import RECEIVER, SENDER, _FakeSMTP


def _parts(msg):
    plain, page = msg.get_payload()
    return (
        plain.get_payload(decode=True).decode("utf-8"),
        page.get_payload(decode=True).decode("utf-8"),
    )


def _header(msg, name):
    return str(make_header(decode_header(msg[name])))


def test_notification_escapes_the_message_and_replies_to_the_visitor():
    msg = site_mail.notification(
        SENDER,
        RECEIVER,
        visitor="dana@example.com",
        message="<script>x</script>\nsecond line",
        topic="סוכן AI",
        route="form",
        lang="en",
        replied=True,
    )
    plain, page = _parts(msg)

    assert msg["To"] == RECEIVER
    assert msg["Reply-To"] == "dana@example.com"
    assert _header(msg, "Subject") == "פנייה חדשה מהאתר: סוכן AI"
    assert "<script>" not in page
    assert "&lt;script&gt;" in page
    assert "second line" in plain
    assert "טופס המייל · אנגלית" in plain
    assert "mailto:dana@example.com" in page


def test_a_topic_cannot_add_a_header():
    msg = site_mail.notification(
        SENDER, RECEIVER, "dana@example.com", "hi", "AI\r\nBcc: x@example.com", "form", "he", True
    )
    raw = msg.as_bytes()
    parsed = message_from_bytes(raw)
    assert parsed["Bcc"] is None


@pytest.mark.parametrize("lang", ["he", "en"])
def test_auto_reply_is_fixed_text_in_the_visitors_language(lang):
    msg = site_mail.auto_reply(SENDER, RECEIVER, "dana@example.com", lang)
    plain, page = _parts(msg)
    copy = site_mail.AUTO_REPLY[lang]

    assert msg["To"] == "dana@example.com"
    assert msg["Reply-To"] == RECEIVER
    assert _header(msg, "Subject") == copy["subject"]
    assert copy["url"] in page and copy["url"] in plain
    assert f'dir="{"rtl" if lang == "he" else "ltr"}"' in page
    # No images: the email reads the same when a mail app blocks them.
    assert "<img" not in page


@pytest.fixture
def client(monkeypatch):
    _FakeSMTP.sent = []
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    monkeypatch.setenv("EMAIL_ADDRESS", SENDER)
    monkeypatch.setenv("EMAIL_PASSWORD", "app-password")
    monkeypatch.setenv("YOUR_EMAIL", RECEIVER)
    monkeypatch.setattr(main.smtplib, "SMTP_SSL", _FakeSMTP)
    monkeypatch.setattr(main, "enforce_rate_limit", lambda *a, **k: None)
    return TestClient(main.app)


def test_the_mail_form_sends_the_notification_then_one_fixed_reply(client):
    response = client.post(
        "/api/contact",
        json={
            "email": "dana@example.com",
            "message": "Buy cheap watches at spam.example",
            "topic": "catchup",
            "lang": "en",
        },
    )

    assert response.status_code == 200
    assert len(_FakeSMTP.sent) == 2
    notice, reply = _FakeSMTP.sent
    assert notice["To"] == RECEIVER
    assert reply["To"] == "dana@example.com"
    plain, page = _parts(reply)
    for part in (plain, page, _header(reply, "Subject")):
        assert "spam.example" not in part
        assert "catchup" not in part
    assert "I got your message" in plain


def test_a_failed_auto_reply_still_reports_the_message_as_sent(client, monkeypatch):
    class _ReplyFails(_FakeSMTP):
        def send_message(self, msg):
            if msg["To"] != RECEIVER:
                raise OSError("recipient refused")
            super().send_message(msg)

    monkeypatch.setattr(main.smtplib, "SMTP_SSL", _ReplyFails)

    response = client.post(
        "/api/contact", json={"email": "dana@example.com", "message": "hello"}
    )

    assert response.status_code == 200
    assert len(_FakeSMTP.sent) == 1
