"""The booking route: what reaches cal.com, and what never does."""

import datetime

import pytest
from starlette.testclient import TestClient

import booking
import main
from routes import booking as booking_route
import rate_limit
import settings


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "ORIGIN_SHARED_SECRET", "")
    monkeypatch.setattr(rate_limit, "enforce_rate_limit", lambda *a, **k: None)
    return TestClient(main.app)


def _soon(days=2):
    t = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=days)
    return t.replace(minute=0, second=0, microsecond=0).isoformat()


def _body(**over):
    body = {"start": _soon(), "name": "Dana", "email": "dana@example.com", "notes": "AI agent", "lang": "he"}
    body.update(over)
    return body


def test_a_booking_is_sent_for_the_fixed_event_in_israel_time(client, monkeypatch):
    sent = {}

    def fake_post(body):
        sent.update(body)
        return {"status": "success", "data": {"uid": "u1", "start": body["start"], "end": "x", "status": "accepted"}}

    monkeypatch.setattr(booking, "_post", fake_post)
    response = client.post("/api/booking", json=_body())

    assert response.status_code == 200
    assert response.json()["booking"]["uid"] == "u1"
    assert sent["username"] == booking.CAL_USERNAME
    assert sent["eventTypeSlug"] == booking.CAL_EVENT_SLUG
    assert sent["attendee"]["timeZone"] == "Asia/Jerusalem"
    assert sent["attendee"]["language"] == "he"
    assert sent["bookingFieldsResponses"] == {"notes": "AI agent"}
    assert sent["start"].endswith("Z")


@pytest.mark.parametrize(
    "over",
    [
        {"email": "not-an-address"},
        {"name": ""},
        {"notes": "x" * 1001},
        {"lang": "fr"},
        {"start": "tomorrow"},
        {"start": _soon(-1)},
        {"start": _soon(booking_route.BOOKING_HORIZON_DAYS + 5)},
        {"start": (datetime.datetime.now() + datetime.timedelta(days=2)).isoformat()},
    ],
)
def test_a_bad_request_never_reaches_cal_com(client, monkeypatch, over):
    def explode(body):
        raise AssertionError("cal.com must not be called")

    monkeypatch.setattr(booking, "_post", explode)
    assert client.post("/api/booking", json=_body(**over)).status_code == 422


def test_a_taken_slot_reads_409_and_other_refusals_502(client, monkeypatch):
    def taken(body):
        raise booking.BookingError("refused", taken=True)

    monkeypatch.setattr(booking, "_post", taken)
    assert client.post("/api/booking", json=_body()).status_code == 409

    def down(body):
        raise booking.BookingError("unreachable")

    monkeypatch.setattr(booking, "_post", down)
    assert client.post("/api/booking", json=_body()).status_code == 502


def test_request_names_itself(monkeypatch):
    """cal.com's Cloudflare refuses urllib's default User-Agent with 1010."""
    seen = {}

    class Reply:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def read(self):
            return b'{"status": "success", "data": {"uid": "u"}}'

    def fake_urlopen(request, timeout):
        seen["ua"] = request.get_header("User-agent")
        seen["version"] = request.get_header("Cal-api-version")
        return Reply()

    monkeypatch.setattr(booking.urllib.request, "urlopen", fake_urlopen)
    booking._post({"start": "x"})
    assert seen["ua"] == booking.USER_AGENT
    assert "urllib" not in seen["ua"].lower()
    assert seen["version"] == booking.CAL_API_VERSION
