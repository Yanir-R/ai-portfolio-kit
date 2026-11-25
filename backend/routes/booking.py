"""Booking the discovery call through cal.com (booking.py does the talking)."""

import datetime
import re

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool

import booking
import rate_limit
import settings
from schemas import BookingRequest

router = APIRouter()

# Booking a slot further ahead than this is refused before cal.com is asked:
# the page never offers one, so such a request did not come from it.
BOOKING_HORIZON_DAYS = 120

# cal.com puts the attendee's name and notes into the confirmation it emails to
# the attendee's address. With someone else's address typed in, a link in
# either would arrive in a stranger's inbox inside a real calendar invite from
# Yanir. A person booking a call has no need for one there.
_LINK_IN_NAME = re.compile(r"https?://|www\.|[/@<>]", re.IGNORECASE)
_LINK_IN_NOTES = re.compile(r"https?://|www\.", re.IGNORECASE)


@router.post("/api/booking")
async def book_call(request: BookingRequest, http_request: Request):
    """Books the discovery call. Rate limited like the contact route."""
    rate_limit.enforce_rate_limit(http_request, rate_limit.contact_limiter, "booking")
    start = request.start
    if start.tzinfo is None:
        raise HTTPException(status_code=422, detail="start needs a time zone")
    now = datetime.datetime.now(datetime.timezone.utc)
    if not now < start < now + datetime.timedelta(days=BOOKING_HORIZON_DAYS):
        raise HTTPException(status_code=422, detail="start is out of range")
    if _LINK_IN_NAME.search(request.name) or _LINK_IN_NOTES.search(request.notes or ""):
        raise HTTPException(status_code=422, detail="links are not accepted here")
    allowed, retry_after = rate_limit.booking_address_limiter.check(str(request.email).lower())
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many bookings for this address",
            headers={"Retry-After": str(retry_after)},
        )
    try:
        result = await run_in_threadpool(
            booking.book,
            start.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
            request.name.strip(),
            str(request.email),
            (request.notes or "").strip() or None,
            request.lang,
        )
    except booking.BookingError as err:
        if err.taken:
            raise HTTPException(status_code=409, detail="slot taken")
        raise HTTPException(status_code=502, detail=settings.INTERNAL_ERROR_DETAIL)
    return {"status": "success", "booking": result}
