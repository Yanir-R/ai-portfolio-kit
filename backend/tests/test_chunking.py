"""Heading-aware chunks: deterministic, exact slices of the body, sized by the rules."""

import pytest

import chunking
import context
from chunking import MAX_CHUNK_TOKENS, MIN_CHUNK_TOKENS, chunk_section, doc_kind_of
from context import CHARS_PER_TOKEN, Section


def _para(words: int, word: str = "lorem") -> str:
    return " ".join([word] * words) + "\n\n"


DOC = Section(
    label="Project / Toy",
    body=(
        "# Toy\n\nIntro line.\n\n"
        "## Small\n\nShort.\n\n"
        "## Big\n\n" + _para(400, "alpha") + _para(400, "beta") +
        "### Deep\n\n" + _para(200, "gamma") +
        "```\n# not a heading\n```\n\n"
        "## Tail\n\nEnd.\n"
    ),
)


def test_chunks_are_contiguous_slices_that_rebuild_the_body():
    chunks = chunk_section(DOC)
    assert "".join(c.text for c in chunks) == DOC.body
    assert chunks[0].char_start == 0 and chunks[-1].char_end == len(DOC.body)
    for previous, current in zip(chunks, chunks[1:]):
        assert previous.char_end == current.char_start
    for chunk in chunks:
        assert DOC.body[chunk.char_start : chunk.char_end] == chunk.text


def test_chunking_is_deterministic():
    assert chunk_section(DOC) == chunk_section(DOC)


def test_heading_paths_follow_the_outline_and_skip_fenced_code():
    chunks = chunk_section(DOC)
    paths = [c.heading_path for c in chunks]
    assert paths[0] == ("Toy",)
    assert ("Toy", "Big") in paths
    assert all("not a heading" not in c.heading for c in chunks)


def test_sizes_respect_the_cap_and_merge_small_sections():
    chunks = chunk_section(DOC)
    assert all(c.token_estimate <= MAX_CHUNK_TOKENS for c in chunks)
    # Intro and "Small" are far under the minimum and merge into one chunk.
    assert "## Small" in chunks[0].text
    assert all(c.token_estimate >= MIN_CHUNK_TOKENS for c in chunks[:-1])


def test_fields_follow_the_schema():
    chunks = chunk_section(DOC)
    ids = [c.chunk_id for c in chunks]
    assert len(set(ids)) == len(ids) and all(len(i) == 64 for i in ids)
    for i, c in enumerate(chunks):
        assert c.chunk_index == i and c.chunk_count == len(chunks)
        assert c.token_estimate == len(c.text) // CHARS_PER_TOKEN
        assert c.doc_label == "Project / Toy" and c.doc_kind == "project" and c.doc_title == "Toy"


def test_context_prefix_is_label_and_headings_without_repeating_the_title():
    big = next(c for c in chunk_section(DOC) if c.heading == "Big")
    assert big.context_prefix == "Project / Toy › Big"


@pytest.mark.parametrize(
    "label, kind",
    [("Profile / resume", "profile"), ("Project / X", "project"), ("Writing / Y", "writing"), ("Other / Z", "document")],
)
def test_doc_kind_comes_from_the_label_prefix(label, kind):
    assert doc_kind_of(label) == kind


def test_an_empty_body_has_no_chunks():
    assert chunk_section(Section(label="Writing / Empty", body="")) == ()


def test_one_enormous_line_is_still_capped():
    body = "x" * (MAX_CHUNK_TOKENS * CHARS_PER_TOKEN * 3)
    chunks = chunk_section(Section(label="Writing / Line", body=body))
    assert "".join(c.text for c in chunks) == body
    assert all(c.token_estimate <= MAX_CHUNK_TOKENS for c in chunks)


def test_every_committed_document_chunks_cleanly(fresh_corpus_cache):
    knowledge = context.get_knowledge()
    for section in knowledge.sections:
        chunks = chunk_section(section)
        assert "".join(c.text for c in chunks) == section.body
        assert all(c.token_estimate <= MAX_CHUNK_TOKENS for c in chunks)
    assert chunking.CHUNKER_VERSION == "1"
