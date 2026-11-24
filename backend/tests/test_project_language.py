"""Projects and profile pages in Hebrew: a twin replaces the prose, never the facts."""

import pytest
from starlette.testclient import TestClient

import main
from docs_helper import get_project_by_slug, get_projects_in

TWINNED = "trinity-crm"


def test_hebrew_twin_replaces_title_overview_and_text():
    english = get_project_by_slug(TWINNED)
    hebrew = get_project_by_slug(TWINNED, "he")
    assert hebrew["language"] == "he"
    assert hebrew["overview"] != english["overview"]
    assert any("֐" <= ch <= "׿" for ch in hebrew["content"])


def test_facts_stay_the_english_write_ups():
    english = get_project_by_slug(TWINNED)
    hebrew = get_project_by_slug(TWINNED, "he")
    for key in ("status", "featured", "repository", "project_type", "media_url"):
        assert hebrew.get(key) == english.get(key)


def test_english_is_unchanged_and_untwinned_projects_fall_back():
    assert "language" not in get_project_by_slug(TWINNED)
    for project in get_projects_in("he"):
        assert project["title"]
        assert project["slug"]


def test_unknown_slug_is_none_in_either_language():
    assert get_project_by_slug("no-such-project", "he") is None


# --- The same through the HTTP routes the site calls --------------------------


@pytest.fixture
def client():
    return TestClient(main.app)


def test_projects_route_takes_a_language(client):
    he = client.get(f"/api/projects/{TWINNED}", params={"lang": "he"}).json()["project"]
    en = client.get(f"/api/projects/{TWINNED}").json()["project"]
    assert he["overview"] != en["overview"]
    # An unknown language reads as English rather than failing.
    assert client.get(f"/api/projects/{TWINNED}", params={"lang": "xx"}).json()["project"] == en


def test_profile_content_has_a_hebrew_twin(client):
    en = client.get("/api/content/about-me.md").json()["content"]
    he = client.get("/api/content/about-me.md", params={"lang": "he"}).json()["content"]
    assert he != en
    # A document without a twin is served in English.
    resume = client.get("/api/content/resume.md").json()["content"]
    assert client.get("/api/content/resume.md", params={"lang": "he"}).json()["content"] == resume
