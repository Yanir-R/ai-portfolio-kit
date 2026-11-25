"""What the API tells browsers about cross-origin calls.

The site's own pages call the API with GET and POST, without cookies. The CORS
answer should say exactly that: a foreign site gets no permission at all, the
site's own origin gets GET and POST only, and no page is ever told it may send
credentials.

These tests do not reach the network; they drive the app through Starlette's
test client, with the edge secret off so the CORS layer is what answers.
"""

import pytest
from starlette.testclient import TestClient

import main

SITE = main.allowed_origins[0]


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    return TestClient(main.app)


def _preflight(client, origin, method="POST"):
    return client.options(
        "/api/booking",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "content-type, cf-turnstile-response",
        },
    )


def test_the_sites_own_origin_may_post(client):
    response = _preflight(client, SITE)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == SITE
    allowed = {m.strip() for m in response.headers["access-control-allow-methods"].split(",")}
    assert {"GET", "POST"} <= allowed
    assert not allowed & {"DELETE", "PUT", "PATCH"}


def test_no_origin_is_told_it_may_send_credentials(client):
    response = _preflight(client, SITE)
    assert "access-control-allow-credentials" not in response.headers
    simple = client.get("/health", headers={"Origin": SITE})
    assert "access-control-allow-credentials" not in simple.headers


def test_methods_the_site_never_uses_are_refused(client):
    assert _preflight(client, SITE, method="DELETE").status_code == 400


def test_a_foreign_origin_gets_no_permission(client):
    response = _preflight(client, "https://evil.example")
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_retry_after_stays_readable_for_the_rate_limit_message(client):
    response = client.get("/health", headers={"Origin": SITE})
    assert "retry-after" in response.headers.get("access-control-expose-headers", "").lower()
