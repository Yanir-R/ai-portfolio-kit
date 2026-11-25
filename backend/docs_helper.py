"""File access for the documents the site publishes.

Reading and parsing only. What the chat is allowed to know, and how that corpus
is assembled and cached, is context.py's job.
"""

from pypdf import PdfReader
import json
import logging
import os
import re
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(BASE_DIR, "docs")

# Yanir's own documents. Named for what it is: this repository is public and
# these files are served over /api/content/, so everything in here is published.
# A name like "private/" would claim an access boundary that does not exist and
# invite putting something sensitive in it.
PROFILE_DIR = os.path.join(DOCS_DIR, "profile")

PROJECTS_DIR = os.path.join(DOCS_DIR, "projects")

# Hebrew versions of the documents above, one file per English file with the
# same name and in the same subdirectory. context.py reads them when a question
# is asked in Hebrew; the pages are still built from the English files.
HEBREW_DIR = os.path.join(DOCS_DIR, "he")

# Two directories deliberately have no constant here.
#
# `docs/templates/` holds placeholder documents for anyone forking this repo.
# Nothing reads it, and the chat corpus is built only from the directories named
# in this module - see context.py on why an empty corpus fails loudly rather than
# falling back to placeholders.
#
# There is no STATIC_DIR either. Project screenshots are frontend assets served
# from the CDN alongside the rest of the site; routing them through this API
# would put static files back on a single-region container.

# `## Section` headings a project write-up may use as metadata. Anything else at
# that level is prose and stays in the body.
PROJECT_METADATA_SECTIONS = frozenset({
    'project_type', 'status', 'demo_url', 'repository',
    'media', 'featured', 'category', 'license',
})


def read_markdown_file(file_path: str) -> str:
    """Read content from markdown file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            return content
    except Exception:
        logger.exception("Error reading file %s", file_path)
        return ""

def read_pdf_file(file_path: str) -> str:
    """Read content from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            return "\n".join(page.extract_text() for page in PdfReader(file).pages)
    except Exception:
        logger.exception("Error reading PDF file %s", file_path)
        return ""

def parse_project_metadata(content: str) -> Dict[str, Any]:
    """Parse project metadata from markdown content"""
    metadata: Dict[str, Any] = {}
    lines = content.split('\n')
    # The `## Technical Details` section is the stack. Bold bullets elsewhere
    # (features, deployment notes) are prose and must not become stack chips.
    in_tech = False

    for i, line in enumerate(lines):
        line = line.strip()
        if line.startswith('## '):
            in_tech = 'technical details' in line.lower()

        # A recognised `## Section` takes its value from the next non-empty,
        # non-heading line. Section names double as metadata keys, so an entry
        # added to PROJECT_METADATA_SECTIONS needs no code change here.
        if line.startswith('## ') and line[3:].strip().lower().replace(' ', '_') in PROJECT_METADATA_SECTIONS:
            current_section = line[3:].strip().lower().replace(' ', '_')
            for j in range(i + 1, len(lines)):
                next_line = lines[j].strip()
                if next_line and not next_line.startswith('#'):
                    metadata[current_section] = (
                        next_line.lower() == 'true'
                        if current_section == 'featured'
                        else next_line
                    )
                    break

        # Handle technical details format (- **Field**: Value)
        elif in_tech and line.startswith('- **') and '**:' in line:
            match = re.match(r'- \*\*(.*?)\*\*:\s*(.*)', line)
            if match:
                key = f"tech_{match.group(1).lower().replace(' ', '_').replace('-', '_')}"
                metadata[key] = match.group(2).strip()

    # Extract title from first h1
    title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
    if title_match:
        metadata['title'] = title_match.group(1)

    # Extract overview - try multiple patterns
    overview_match = re.search(r'## Overview\s*\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if not overview_match:
        # Try to extract the first paragraph after the title and subtitle
        lines = content.split('\n')
        overview_lines = []
        found_title = False
        skip_empty = True

        for line in lines:
            line = line.strip()
            if line.startswith('# '):
                found_title = True
                continue
            elif found_title and line and not line.startswith('#') and not line.startswith('🎮'):
                if skip_empty and (line.startswith('**') or len(line) < 20):
                    continue
                skip_empty = False
                if line.startswith('##'):
                    break
                overview_lines.append(line)
                if len(' '.join(overview_lines)) > 200:  # Stop after reasonable length
                    break

        if overview_lines:
            metadata['overview'] = ' '.join(overview_lines).strip()
    else:
        metadata['overview'] = overview_match.group(1).strip()

    return metadata

def get_all_projects() -> List[Dict[str, Any]]:
    """Get all projects with their metadata"""
    projects = []

    if not os.path.exists(PROJECTS_DIR):
        return projects

    # Sorted so the order is the same on every filesystem.
    for filename in sorted(os.listdir(PROJECTS_DIR)):
        if filename.endswith('.md'):
            file_path = os.path.join(PROJECTS_DIR, filename)
            content = read_markdown_file(file_path)

            if content:
                metadata = parse_project_metadata(content)
                metadata['slug'] = filename[:-3]  # Remove .md extension
                metadata['content'] = content

                # A `## Media` value is a location the browser can fetch: an
                # absolute URL, or a root-relative path the frontend serves out
                # of `public/`. Anything else is a mistake in the write-up.
                # A bare filename is not resolved against a backend directory -
                # nothing mounts `/static`, and serving screenshots from the API
                # container is what the CDN exists to avoid.
                media_name = metadata.get('media', '')
                if media_name:
                    if media_name.startswith(('http://', 'https://', '/')):
                        metadata['has_media'] = True
                        metadata['media_url'] = media_name
                    else:
                        # Named rather than silently dropped: a screenshot that
                        # does not appear is otherwise indistinguishable from a
                        # write-up that never had one.
                        logger.warning(
                            "Project %s: media %r is neither an absolute URL nor a "
                            "root-relative path, so it cannot be fetched. Put the file in "
                            "frontend/public/projects/ and reference it as "
                            "/projects/<name>.",
                            filename, media_name,
                        )
                        metadata['has_media'] = False
                        metadata['media_url'] = None

                # Always present, so the sort key below and every consumer can
                # read it without a default of their own.
                metadata.setdefault('featured', False)

                projects.append(metadata)

    # Sort by featured status
    projects.sort(key=lambda x: x.get('featured', False), reverse=True)
    return projects

# A Hebrew twin under docs/he/projects/ replaces what a reader reads: the
# title, the overview, the text and the technical details. What describes the
# project rather than the prose (status, media, links, featured) stays the
# English write-up's, so the two languages never disagree on facts.
PROJECT_LANGUAGES = ("en", "he")


def _in_language(project: Dict[str, Any], lang: str) -> Dict[str, Any]:
    if lang != "he":
        return project
    path = os.path.join(HEBREW_DIR, "projects", f"{project['slug']}.md")
    content = read_markdown_file(path) if os.path.isfile(path) else None
    if not content:
        return project
    twin = parse_project_metadata(content)
    merged = {key: value for key, value in project.items() if not key.startswith("tech_")}
    merged.update({key: value for key, value in twin.items() if key.startswith("tech_")})
    for key in ("title", "overview"):
        if twin.get(key):
            merged[key] = twin[key]
    merged["content"] = content
    merged["language"] = "he"
    return merged


def get_project_by_slug(slug: str, lang: str = "en") -> Optional[Dict[str, Any]]:
    """Get a specific project by its slug, in `lang` where a twin exists"""
    projects = get_all_projects()
    project = next((p for p in projects if p['slug'] == slug), None)
    return _in_language(project, lang) if project else None


def get_projects_in(lang: str = "en", featured_only: bool = False) -> List[Dict[str, Any]]:
    """All projects (or only featured ones), in `lang` where a twin exists"""
    projects = get_featured_projects() if featured_only else get_all_projects()
    return [_in_language(p, lang) for p in projects]


def get_featured_projects() -> List[Dict[str, Any]]:
    """Get only featured projects"""
    return [p for p in get_all_projects() if p.get('featured', False)]


# ---------------------------------------------------------------------------
# Writing
# ---------------------------------------------------------------------------
#
# Long-form pieces and short posts published elsewhere, republished here with a
# link back to the original. They live in the same docs tree as the projects and
# are assembled into the same corpus, so what a visitor reads and what the chat
# can answer from stay the same bytes.

WRITING_DIR = os.path.join(DOCS_DIR, "writing")

# `media` is deliberately plural here, unlike a project's single screenshot: a
# post often carries two or three images and they are part of the argument.
WRITING_SECTIONS = ("kind", "source", "url", "date", "media", "summary", "related")

# Sections that hold a list, one item per line, rather than a single value.
WRITING_LIST_SECTIONS = ("media", "related")


def _parse_sections(content: str, section_names: tuple) -> Dict[str, List[str]]:
    """Collect the body lines under each recognised `## Section`.

    Returns every section as a list of lines so a caller can decide whether a
    section is single-valued. Parsing stops a section at the next heading of any
    level, so prose headings inside the article body cannot leak into metadata.
    """
    collected: Dict[str, List[str]] = {}
    current: Optional[str] = None

    for raw in content.split('\n'):
        line = raw.strip()

        if line.startswith('#'):
            heading = line.lstrip('#').strip().lower().replace(' ', '_')
            current = heading if (line.startswith('## ') and heading in section_names) else None
            continue

        if current and line:
            collected.setdefault(current, []).append(line)

    return collected


def parse_writing_metadata(content: str) -> Dict[str, Any]:
    """Metadata for one piece of writing, plus its title."""
    sections = _parse_sections(content, WRITING_SECTIONS)

    metadata: Dict[str, Any] = {}
    for name, lines in sections.items():
        metadata[name] = lines if name in WRITING_LIST_SECTIONS else lines[0]

    title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
    if title_match:
        metadata['title'] = title_match.group(1).strip()

    return metadata


# Curation that is not prose: the closed list of topics, a Hebrew one-liner per
# piece, a verbatim quote, a dated note on a piece that has gone out of date,
# what kind each media file is, and series. Kept apart from the .md files so the
# chat corpus stays the writing itself, and so the whole index can be checked in
# one test (tests/test_writing_index.py).
WRITING_INDEX_PATH = os.path.join(DOCS_DIR, "writing-index.json")

_VIDEO_EXTENSIONS = (".mp4", ".webm")

_writing_index_cache: Dict[str, Any] = {}


def get_writing_index() -> Dict[str, Any]:
    """The curation file, read once. Empty sections if it is missing."""
    if not _writing_index_cache:
        try:
            with open(WRITING_INDEX_PATH, encoding="utf-8") as handle:
                loaded = json.load(handle)
        except FileNotFoundError:
            logger.warning("Writing index %s does not exist", WRITING_INDEX_PATH)
            loaded = {}
        _writing_index_cache.update(
            topics=loaded.get("topics", []),
            series=loaded.get("series", []),
            pieces=loaded.get("pieces", {}),
        )
    return _writing_index_cache


def _media_items(entry: Dict[str, Any], curated: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Every media file with its kind: image, video, or clip (a short silent loop).

    Curated media come first, then the plain paths of the `## Media` section that
    are not already among them, typed by extension.
    """
    items = [dict(item) for item in curated.get("media", [])]
    seen = {item.get("src") for item in items} | {item.get("poster") for item in items}
    for path in entry.get("media", []):
        if path in seen:
            continue
        kind = "video" if path.lower().endswith(_VIDEO_EXTENSIONS) else "image"
        items.append({"kind": kind, "src": path})
    return items


def _series_of(slug: str) -> Optional[Dict[str, Any]]:
    for series in get_writing_index()["series"]:
        for position, part in enumerate(series.get("parts", [])):
            if part["slug"] == slug:
                return {
                    "id": series["id"],
                    "label": part.get("label", ""),
                    "label_he": part.get("label_he", ""),
                    "position": position + 1,
                    "count": len(series["parts"]),
                }
    return None


def _curated(entry: Dict[str, Any]) -> Dict[str, Any]:
    """Adds the index's fields to one parsed piece."""
    curated = get_writing_index()["pieces"].get(entry["slug"], {})
    for field in ("topics", "summary_he", "quote", "note"):
        if field in curated:
            entry[field] = curated[field]
    entry.setdefault("topics", [])
    entry["media_items"] = _media_items(entry, curated)
    series = _series_of(entry["slug"])
    if series:
        entry["series"] = series
    return entry


def writing_overview(entries: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Counts by source and topic, and the series, for the blog page and the chat."""
    sources: Dict[str, int] = {}
    topic_counts: Dict[str, int] = {}
    for entry in entries:
        source = entry.get("source") or ""
        sources[source] = sources.get(source, 0) + 1
        for topic in entry.get("topics", []):
            topic_counts[topic] = topic_counts.get(topic, 0) + 1
    index = get_writing_index()
    topics = [
        {**topic, "count": topic_counts.get(topic["id"], 0)}
        for topic in index["topics"]
        if topic_counts.get(topic["id"])
    ]
    topics.sort(key=lambda topic: -topic["count"])
    series = [
        {
            **{key: value for key, value in item.items() if key != "parts"},
            "parts": item.get("parts", []),
            "count": len(item.get("parts", [])),
        }
        for item in index["series"]
    ]
    return {"total": len(entries), "sources": sources, "topics": topics, "series": series}


def get_all_writing() -> List[Dict[str, Any]]:
    """Every piece, newest first.

    Sorted on the `date` string, which is ISO so it sorts correctly as text.
    Anything missing a date sorts last rather than crashing the list.
    """
    if not os.path.exists(WRITING_DIR):
        logger.warning("Writing directory %s does not exist", WRITING_DIR)
        return []

    entries: List[Dict[str, Any]] = []
    for filename in sorted(os.listdir(WRITING_DIR)):
        if not filename.endswith('.md'):
            continue

        content = read_markdown_file(os.path.join(WRITING_DIR, filename))
        if not content:
            continue

        entry = parse_writing_metadata(content)
        entry['slug'] = filename[:-3]
        entry['content'] = content
        entries.append(_curated(entry))

    return sorted(entries, key=lambda e: e.get('date') or '', reverse=True)


def get_writing_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """One piece, or None. Slug is confined to the writing directory."""
    root = os.path.realpath(WRITING_DIR)
    path = os.path.realpath(os.path.join(root, f"{slug}.md"))

    # The router already refuses a "/" inside a path parameter, but os.path.join
    # honours an absolute path silently, so containment is asserted rather than
    # assumed - the same guard /api/content/ uses.
    if os.path.commonpath([root, path]) != root or not os.path.isfile(path):
        return None

    content = read_markdown_file(path)
    if not content:
        return None

    entry = parse_writing_metadata(content)
    entry['slug'] = slug
    entry['content'] = content
    return _curated(entry)
