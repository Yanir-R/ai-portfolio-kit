"""Booking the discovery call on cal.com, on the visitor's behalf.

The site draws the booking screens itself and reads the free times straight
from cal.com in the browser (the slots endpoint is public). Only the booking
itself comes through here, so it passes the Worker's Turnstile check and the
contact rate limit like any other message that reaches Yanir.

No API key is involved: the event type is public, and cal.com's v2 booking
endpoint takes an unauthenticated request for it, the same way its own booking
page does. The event is fixed here rather than taken from the request, so this
route can book Yanir's discovery call and nothing else.
"""

import json
import logging
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

CAL_API_URL = "https://api.cal.com/v2/bookings"
# cal.com versions each endpoint by header; this is the value its booking
# reference names. Without it the endpoint answers with an older shape.
CAL_API_VERSION = "2026-02-25"
CAL_USERNAME = "yanirrot"
CAL_EVENT_SLUG = "zoom-call"
# Times are shown and booked in Israel time; the attendee's zone also sets the
# time written in cal.com's own confirmation email.
TIME_ZONE = "Asia/Jerusalem"
CAL_TIMEOUT_SECONDS = 15


class BookingError(Exception):
    """cal.com refused or could not be reached. `taken` marks a lost slot."""

    def __init__(self, message: str, taken: bool = False):
        super().__init__(message)
        self.taken = taken


def _post(body: Dict[str, Any]) -> Dict[str, Any]:
    """One blocking POST to cal.com; call from a worker thread."""
    request = urllib.request.Request(
        CAL_API_URL,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "cal-api-version": CAL_API_VERSION,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=CAL_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", "replace")[:500]
        # cal.com's own words, logged and never returned: they can name the
        # account and its configuration.
        logger.warning("cal.com booking refused: %s %s", err.code, detail)
        # A slot taken between reading the times and booking is the one refusal
        # a visitor can act on (pick another time), so it is told apart.
        taken = err.code in (400, 409) and "available" in detail.lower()
        raise BookingError("refused", taken=taken) from err
    except (urllib.error.URLError, TimeoutError, ValueError) as err:
        logger.warning("cal.com booking failed: %s", err)
        raise BookingError("unreachable") from err


def book(start: str, name: str, email: str, notes: Optional[str], language: str) -> Dict[str, Any]:
    """Books the call starting at `start` (ISO 8601) and returns what the page shows.

    Raises BookingError when cal.com refuses or cannot be reached.
    """
    body: Dict[str, Any] = {
        "start": start,
        "username": CAL_USERNAME,
        "eventTypeSlug": CAL_EVENT_SLUG,
        "attendee": {
            "name": name,
            "email": email,
            "timeZone": TIME_ZONE,
            "language": language,
        },
    }
    if notes:
        body["bookingFieldsResponses"] = {"notes": notes}

    payload = _post(body)
    data = payload.get("data")
    # A single booking returns one object; a recurring one a list. This event
    # is never recurring, but a list should not crash the page.
    if isinstance(data, list):
        data = data[0] if data else None
    if payload.get("status") != "success" or not isinstance(data, dict):
        logger.warning("cal.com booking answered without a booking: %s", str(payload)[:300])
        raise BookingError("no booking")

    return {
        "uid": data.get("uid"),
        "start": data.get("start"),
        "end": data.get("end"),
        "status": data.get("status"),
    }
