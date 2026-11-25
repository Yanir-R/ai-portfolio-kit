"""The API: the app, the checks every request passes, and its routes.

Each part of the site has its own module under routes/, and this file only
puts them together, in the shape FastAPI suggests for an application larger
than one file:

- settings.py: configuration read from the environment
- schemas.py: every request and reply shape
- routes/: chat, contact, booking and read-only content
- replies.py, mailer.py: what the chat and contact routes are built from

Run with `uvicorn main:app`.
"""

import logging
from hmac import compare_digest

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import settings
from routes import booking, chat, contact, content

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# The interactive docs and the OpenAPI schema describe every route to anyone who
# asks. Nothing on the site uses them, so they are not served.
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

# The one path that stays reachable without the header, for Cloud Run's own
# health probing and any uptime check. It costs no quota and answers a bare
# status, nothing about the service behind it.
_UNGUARDED_PATHS = frozenset({"/health"})


@app.middleware("http")
async def require_edge_secret(request: Request, call_next):
    # Whether this request is *proven* to have arrived through our Cloudflare
    # Worker. Only a valid secret establishes that, so it starts false and is
    # never assumed - when the secret is unset the API is reachable directly and
    # nothing about the forwarding chain can be trusted.
    #
    # rate_limit.client_key reads this to decide whether CF-Connecting-IP is
    # believable. That header is trivially forgeable by anyone talking to the
    # origin, and worthless on its own; it is only meaningful once the request
    # has proved it came through the edge that set it.
    request.state.edge_verified = False

    if settings.ORIGIN_SHARED_SECRET and request.url.path not in _UNGUARDED_PATHS:
        # Preflights never carry custom headers - the browser sends them to ask
        # whether the real request may. Rejecting them here would break CORS
        # for the legitimate frontend; the request that follows is still
        # checked.
        if request.method != "OPTIONS":
            presented = request.headers.get("x-edge-auth", "")
            # compare_digest rather than == so the comparison does not return
            # early on the first differing byte. Compared as bytes because
            # compare_digest raises on a non-ASCII str, which any caller can
            # send.
            if not compare_digest(
                presented.encode("utf-8"), settings.ORIGIN_SHARED_SECRET.encode("utf-8")
            ):
                logger.warning(
                    "Rejected request to %s without a valid edge secret", request.url.path
                )
                return JSONResponse(status_code=403, content={"detail": "Forbidden"})
            request.state.edge_verified = True
    return await call_next(request)


# Read-only content that changes only when a new image is deployed. Without a
# Cache-Control header every page view refetched the same JSON from Cloud Run,
# and with min-instances=0 a first visit after a quiet spell paid a cold start
# for data the browser already had. Five minutes fresh, then served from the
# browser's copy while it refreshes in the background, so a new post appears at
# most a few minutes after its deploy.
_CACHEABLE_PREFIXES = ("/api/writing", "/api/projects", "/api/content/")
READ_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600"


@app.middleware("http")
async def cache_read_only_content(request: Request, call_next):
    response = await call_next(request)
    if (
        request.method == "GET"
        and response.status_code == 200
        and request.url.path.startswith(_CACHEABLE_PREFIXES)
        and "cache-control" not in response.headers
    ):
        response.headers["Cache-Control"] = READ_CACHE_CONTROL
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    # The site sends no cookies and no auth headers of its own, so there is
    # nothing for a browser to attach credentials to. Saying so keeps a future
    # cookie from becoming readable cross-origin by accident.
    allow_credentials=False,
    # Every route is GET or POST; a preflight lists only what the site uses.
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    # Response headers are not readable by cross-origin JavaScript unless they
    # are exposed. Without this the frontend can see the 429 status but not the
    # Retry-After value the limiter computed, so it cannot tell the visitor how
    # long to wait.
    expose_headers=["Retry-After"],
)


@app.get("/")
@app.get("/health")
async def health_check():
    # A bare status: a probe needs nothing more, and an anonymous caller should
    # learn nothing about what runs here.
    return {"status": "ok"}


app.include_router(chat.router)
app.include_router(contact.router)
app.include_router(booking.router)
app.include_router(content.router)
