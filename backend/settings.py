"""The server's configuration, read once from the environment.

Everything the deployment decides (addresses, keys, allowed sites) is read
here and nowhere else, so a reader looking for what the service depends on
has one file to open. Request handlers read these as `settings.NAME` at call
time, which is also what lets a test change one for the length of a test.

Fixed limits that belong to one part of the service (request sizes, rate
limits, the booking horizon) stay beside the code they limit.
"""

import logging
import os
from typing import List

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Unexpected exceptions are logged server-side with a stack trace and reported to
# clients as this opaque string, so internal paths and configuration details are
# never reflected back in an error response.
INTERNAL_ERROR_DETAIL = "Internal server error"


def validate_email_config() -> bool:
    required_vars = ["EMAIL_ADDRESS", "EMAIL_PASSWORD", "YOUR_EMAIL"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        logger.error("Missing required environment variables: %s", ", ".join(missing_vars))
        return False
    return True


if not validate_email_config():
    logger.warning("Email configuration is incomplete. Email functionality will not work!")

FRONTEND_PROD_URL = os.getenv("FRONTEND_PROD_URL", "")
FRONTEND_DEV_URL = os.getenv("FRONTEND_DEV_URL", "http://localhost:3000")
FRONTEND_VITE_URL = os.getenv("FRONTEND_VITE_URL", "http://127.0.0.1:3000")

# Local dev hosts are always permitted. Deployed origins are assembled from the
# FRONTEND_* vars above plus a comma-separated ALLOWED_ORIGINS, so pointing the
# API at a new frontend host (Cloudflare Pages, a custom domain) is a config
# change rather than a code change. No wildcard: the list names exactly which
# sites may call.
_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def _build_allowed_origins() -> List[str]:
    configured = [FRONTEND_PROD_URL, FRONTEND_DEV_URL, FRONTEND_VITE_URL]
    configured += os.getenv("ALLOWED_ORIGINS", "").split(",")

    origins: List[str] = []
    seen = set()
    for origin in _DEV_ORIGINS + configured:
        origin = origin.strip().rstrip("/")
        if origin and origin not in seen:
            seen.add(origin)
            origins.append(origin)
    return origins


allowed_origins = _build_allowed_origins()
logger.info("CORS allowed origins: %s", allowed_origins)


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Shared secret proving a request arrived through Cloudflare rather than by
# calling the run.app URL directly.
#
# CORS does not do this job: it is enforced by browsers, on browsers, so curl, a
# script, or anything that omits an Origin header is unaffected. The allowlist
# above stops another website's JavaScript using this API, but does nothing about
# the case that actually costs something - somebody pointing a loop at
# /chat-with-files and burning the Gemini quota, or saturating the global limiter
# so real visitors get 429s.
#
# The edge injects this header on every request it forwards. The value has to be
# unguessable, because any client can send an arbitrary header: the header is not
# a secret channel, the VALUE is the secret. Cloudflare's own docs make the same
# point about forwarded client-certificate headers.
#
# Unset means unenforced, deliberately. That lets the header be introduced at the
# edge and the frontend be repointed before enforcement begins, so no ordering of
# those deploys can strand the site talking to an API that has started rejecting
# it. Setting the variable is the last step, not the first.
ORIGIN_SHARED_SECRET = os.getenv("ORIGIN_SHARED_SECRET", "").strip()
