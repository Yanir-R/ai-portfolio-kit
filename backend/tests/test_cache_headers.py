"""Which responses a browser may keep, and which it must not."""

import pytest
from starlette.testclient import TestClient

import main
import settings


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "ORIGIN_SHARED_SECRET", "")
    return TestClient(main.app)


@pytest.mark.parametrize("path", ["/api/writing", "/api/projects"])
def test_published_content_may_be_cached(client, path):
    response = client.get(path)

    assert response.status_code == 200
    assert response.headers["cache-control"] == main.READ_CACHE_CONTROL


def test_a_missing_piece_is_not_cached(client):
    # A 404 cached for five minutes would hide a post published a minute later.
    response = client.get("/api/writing/no-such-piece")

    assert response.status_code == 404
    assert "cache-control" not in response.headers


def test_status_and_health_are_never_cached(client):
    for path in ("/health", "/api/chat/status"):
        assert "cache-control" not in client.get(path).headers
