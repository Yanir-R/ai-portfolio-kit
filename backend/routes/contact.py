"""The contact form: a message to Yanir, and a short reply to the visitor."""

import logging

from fastapi import APIRouter, Request

import mailer
import rate_limit
from schemas import ContactRequest

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/api/contact")
async def contact(request: ContactRequest, http_request: Request):
    """Sends a contact message. Rate limited per client and globally."""
    rate_limit.enforce_rate_limit(http_request, rate_limit.contact_limiter, "contact")
    # The short reply goes to the address the visitor typed, so it is limited
    # by that address (see rate_limit.auto_reply_limiter). Past the limit the
    # message still reaches Yanir; only the courtesy reply is skipped.
    reply_allowed, _ = rate_limit.auto_reply_limiter.check(str(request.email).lower())
    if not reply_allowed:
        logger.warning("Auto-reply skipped: recipient or daily limit reached")
    await mailer.send_contact_email(
        request.email,
        request.message,
        topic=request.topic,
        route="form",
        lang=request.lang,
        reply_to_visitor=reply_allowed,
    )
    return {"status": "success", "message": "Email sent successfully"}
