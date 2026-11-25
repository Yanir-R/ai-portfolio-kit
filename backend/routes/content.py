"""Read-only content: the profile, the writing and the projects.

Everything these routes return is already public on the site, so they need
no rate limit beyond the edge's; main.py adds a short browser cache to them.
"""

import logging
import os

from fastapi import APIRouter, HTTPException

import settings
from docs_helper import (
    HEBREW_DIR,
    PROFILE_DIR,
    PROJECT_LANGUAGES,
    get_all_writing,
    get_project_by_slug,
    get_projects_in,
    get_writing_by_slug,
    read_markdown_file,
    writing_overview,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/api/content/{file_name}")
async def get_content(file_name: str, lang: str = "en"):
    try:
        # Resolve and confine to PROFILE_DIR. The router already refuses to match
        # "/" inside a path param, but os.path.join() would silently honour an
        # absolute path, so containment is asserted here rather than assumed.
        profile_root = os.path.realpath(PROFILE_DIR)
        file_path = os.path.realpath(os.path.join(profile_root, file_name))

        if os.path.commonpath([profile_root, file_path]) != profile_root:
            raise HTTPException(status_code=404, detail="File not found")

        if not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # The Hebrew twin of a profile document, where one exists. It is looked
        # up by the already-validated name, so it cannot leave docs/he/profile.
        if lang == "he":
            twin = os.path.join(HEBREW_DIR, "profile", os.path.basename(file_path))
            if os.path.isfile(twin):
                file_path = twin

        content = read_markdown_file(file_path)
        return {"content": content}
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_content failed for %r", file_name)
        raise HTTPException(status_code=500, detail=settings.INTERNAL_ERROR_DETAIL)


@router.get("/api/writing")
async def list_writing():
    """Published pieces, newest first.

    Read-only and unauthenticated, like the project endpoints: everything it
    returns is already public on the site it links back to.
    """
    try:
        entries = get_all_writing()
        return {"writing": entries, "overview": writing_overview(entries)}
    except Exception:
        logger.exception("Error listing writing")
        raise HTTPException(status_code=500, detail=settings.INTERNAL_ERROR_DETAIL)


@router.get("/api/writing/{slug}")
async def get_writing(slug: str):
    try:
        entry = get_writing_by_slug(slug)
        if entry is None:
            raise HTTPException(status_code=404, detail="Not found")
        return {"entry": entry}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching writing %s", slug)
        raise HTTPException(status_code=500, detail=settings.INTERNAL_ERROR_DETAIL)


def _project_language(lang: str) -> str:
    """An unknown language reads as English rather than failing the request."""
    return lang if lang in PROJECT_LANGUAGES else "en"


@router.get("/api/projects")
async def get_projects(featured_only: bool = False, lang: str = "en"):
    """Get all projects or only featured projects, in Hebrew where a twin exists"""
    try:
        projects = get_projects_in(_project_language(lang), featured_only)

        # Remove full content from listing to reduce payload size
        for project in projects:
            if 'content' in project:
                del project['content']

        return {"projects": projects}
    except Exception:
        logger.exception("Error fetching projects")
        raise HTTPException(status_code=500, detail=settings.INTERNAL_ERROR_DETAIL)

@router.get("/api/projects/{slug}")
async def get_project(slug: str, lang: str = "en"):
    """Get a specific project by slug, in Hebrew where a twin exists"""
    try:
        project = get_project_by_slug(slug, _project_language(lang))
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        return {"project": project}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching project %r", slug)
        raise HTTPException(status_code=500, detail=settings.INTERNAL_ERROR_DETAIL)
