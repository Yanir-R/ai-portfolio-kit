"""Mail to Yanir: the contact notification, and the visitor's short reply.

Used by the contact form (routes/contact.py) and by an address left in the
chat (routes/chat.py), so both paths send the same message and fail the same
way. The message bodies themselves are built in site_mail.py.
"""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from typing import Optional

from email_validator import validate_email
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool

import settings
import site_mail

logger = logging.getLogger(__name__)

# Seconds one SMTP connection may take. Without a ceiling a stalled mail server
# would hold a worker thread for as long as the socket stayed open.
SMTP_TIMEOUT_SECONDS = 10


def validated_address(candidate: str) -> str:
    """Returns the normalised address, or raises EmailNotValidError.

    Syntax only. The deliverability check is a DNS lookup, which is a blocking
    network call on the request path for a result the SMTP send reports anyway.
    """
    return validate_email(candidate, check_deliverability=False).email


def smtp_send(
    msg: MIMEMultipart,
    sender_email: str,
    sender_password: str,
    follow_up: Optional[MIMEMultipart] = None,
) -> None:
    """Sends a prepared message, then an optional second one, over one SMTP login.

    Blocking; call from a worker thread. Only the first message decides the
    outcome: the follow-up is the visitor's courtesy reply, and failing to send
    it must not report their message to Yanir as lost.
    """
    logger.info("Attempting to connect to SMTP server...")
    with smtplib.SMTP_SSL(
        'smtp.gmail.com', 465, timeout=SMTP_TIMEOUT_SECONDS
    ) as server:
        logger.info("Connected to SMTP server, attempting login...")
        server.login(sender_email, sender_password)
        logger.info("Logged in successfully, sending email...")
        server.send_message(msg)
        logger.info("Contact notification email sent")
        if follow_up is not None:
            try:
                server.send_message(follow_up)
                logger.info("Visitor auto-reply sent")
            except Exception:
                logger.exception("Visitor auto-reply failed")


async def send_contact_email(
    email: str,
    message: str,
    *,
    topic: Optional[str] = None,
    route: str = "chat",
    lang: Optional[str] = None,
    reply_to_visitor: bool = False,
) -> None:
    """Delivers a collected address to Yanir's inbox.

    Raises HTTPException on a configuration or SMTP failure; callers decide how
    that reads to the visitor. The chat flow answers with a message offering the
    address directly, while the HTTP route surfaces the status.
    """
    try:
        # Email configuration
        sender_email = os.getenv("EMAIL_ADDRESS")
        sender_password = os.getenv("EMAIL_PASSWORD")
        receiver_email = os.getenv("YOUR_EMAIL")

        logger.info("Preparing contact notification email")

        if not all([sender_email, sender_password, receiver_email]):
            logger.error("Missing email configuration")
            raise HTTPException(status_code=500, detail=settings.INTERNAL_ERROR_DETAIL)

        # Yanir's notification in the site's look; replying to it answers the
        # visitor. The mail form also sends the visitor a fixed short reply.
        msg = site_mail.notification(
            sender_email,
            receiver_email,
            visitor=email,
            message=message,
            topic=topic,
            route=route,
            lang=lang,
            replied=reply_to_visitor,
        )
        follow_up = (
            site_mail.auto_reply(sender_email, receiver_email, email, lang or "he")
            if reply_to_visitor
            else None
        )

        try:
            # smtplib is synchronous; see the note on the Gemini call.
            await run_in_threadpool(
                smtp_send, msg, sender_email, sender_password, follow_up
            )
        except Exception:
            # The raw SMTP error names the sender account and the server, so it
            # stays server-side: returning it would reflect both back to anyone
            # who can make a send fail.
            logger.exception("SMTP send failed")
            raise HTTPException(status_code=500, detail=settings.INTERNAL_ERROR_DETAIL)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Contact delivery error")
        raise HTTPException(status_code=500, detail=settings.INTERNAL_ERROR_DETAIL)
