"""Index verification (plan section 9.2): schema, staleness, offsets, dimensions, rankings.

Every index here is built in memory or under tmp_path from FAKE vectors
(tests/fake_embeddings.py). No network, no key, and nothing is written to
backend/index/.
"""

import copy
import json
import os
import shutil
import sys
from pathlib import Path

import pytest

import context
import retrieval
import vector_index
from fake_embeddings import FAKE_DIMENSIONS, FAKE_MODEL, committed_corpus_payload, fake_embed_texts
from vector_index import LOAD_INVALID, LOAD_MISSING, LOAD_OK, LOAD_STALE, LOAD_UNREADABLE

TOOLS = Path(__file__).resolve().parents[2] / "tools"
HERE = Path(__file__).resolve().parent
CORE = {"Profile / about-me", "Profile / resume"}


@pytest.fixture
def knowledge(fresh_corpus_cache):
    return context.get_knowledge()


@pytest.fixture
def payload(knowledge):
    return committed_corpus_payload(knowledge)


def _expected():
    return vector_index.corpus_hash(model=FAKE_MODEL, dimensions=FAKE_DIMENSIONS)


def _load(source, knowledge, expected=None):
    return vector_index.load_index(
        source, knowledge, expected_corpus_hash=expected or _expected(), model=FAKE_MODEL, dimensions=FAKE_DIMENSIONS
    )


# --- schema -----------------------------------------------------------------------


def test_a_built_index_has_exactly_the_section_5_1_fields(payload):
    assert set(payload) == set(vector_index.HEADER_FIELDS) | {"chunks"}
    assert payload["schema_version"] == "1" and payload["chunker_version"] == "1"
    for record in payload["chunks"]:
        assert set(record) == set(vector_index.CHUNK_FIELDS)
        assert "tags" not in record and "updated" not in record


def test_the_written_file_loads_and_validates(payload, knowledge, tmp_path):
    path = tmp_path / "chunks.v1.json"
    vector_index.write_payload(str(path), payload)
    result = _load(str(path), knowledge)
    assert result.status == LOAD_OK and result.ok
    assert len(result.index.vectors) == len(payload["chunks"])


def test_the_serialised_file_is_one_line_per_chunk_and_valid_json(payload):
    text = vector_index.serialise(payload)
    assert json.loads(text) == json.loads(json.dumps(payload))
    assert len(text.splitlines()) == len(vector_index.HEADER_FIELDS) + len(payload["chunks"]) + 4


def test_building_twice_is_byte_identical(knowledge):
    first = vector_index.serialise(committed_corpus_payload(knowledge))
    second = vector_index.serialise(committed_corpus_payload(knowledge))
    assert first == second


@pytest.mark.parametrize(
    "mutate, reason",
    [
        (lambda p: p.pop("corpus_hash"), "header_corpus_hash"),
        (lambda p: p.update(dimensions=True), "header_dimensions"),
        (lambda p: p.update(schema_version="2"), "schema_version"),
        (lambda p: p.update(chunks={}), "chunks_not_a_list"),
        (lambda p: p["chunks"][0].pop("doc_hash"), "chunk_doc_hash"),
        (lambda p: p["chunks"][0].update(chunk_index="0"), "chunk_chunk_index"),
        (lambda p: p["chunks"][0].update(published=7), "chunk_published"),
        (lambda p: p["chunks"][0].update(doc_kind="profile"), "doc_kind"),
        (lambda p: p["chunks"][1].update(chunk_id=p["chunks"][0]["chunk_id"]), "duplicate_chunk_id"),
    ],
)
def test_a_schema_violation_is_invalid_with_a_stable_reason(payload, knowledge, mutate, reason):
    broken = copy.deepcopy(payload)
    mutate(broken)
    result = _load(broken, knowledge)
    assert (result.status, result.reason, result.index) == (LOAD_INVALID, reason, None)


def test_a_missing_file_and_an_unreadable_file_degrade_without_raising(knowledge, tmp_path):
    assert _load(str(tmp_path / "absent.json"), knowledge).status == LOAD_MISSING
    bad = tmp_path / "bad.json"
    bad.write_text("{not json", encoding="utf-8")
    assert _load(str(bad), knowledge).status == LOAD_UNREADABLE
    assert _load(["not", "an", "object"], knowledge).status == LOAD_INVALID


# --- staleness ----------------------------------------------------------------------


def test_corpus_hash_matches_the_current_docs(payload):
    assert payload["corpus_hash"] == _expected()


def test_corpus_hash_covers_chunker_model_and_dimension():
    base = vector_index.corpus_hash()
    assert vector_index.corpus_hash(chunker_version="2") != base
    assert vector_index.corpus_hash(model="gemini-embedding-001") != base
    assert vector_index.corpus_hash(dimensions=1536) != base
    assert vector_index.corpus_hash() == base


def test_corpus_hash_reads_the_same_files_as_the_corpus_fingerprint():
    assert vector_index.content_files() == [path for path, _size, _mtime in context._fingerprint()]
    assert all(not path.endswith(os.sep + "templates") for path in vector_index.content_files())


def test_a_mutated_doc_makes_the_index_stale(payload, knowledge, tmp_path, monkeypatch):
    # A copy of the docs under another root: same repo paths, so the same hash...
    backend = tmp_path / "backend"
    dirs = []
    for directory in context._CONTENT_DIRS:
        target = backend / os.path.relpath(directory, vector_index.BASE_DIR)
        shutil.copytree(directory, target)
        dirs.append(str(target))
    monkeypatch.setattr(vector_index, "BASE_DIR", str(backend))
    monkeypatch.setattr(context, "_CONTENT_DIRS", tuple(dirs))
    assert _expected() == payload["corpus_hash"]

    # ...until one byte of one document changes.
    edited = sorted(Path(dirs[2]).iterdir())[0]
    edited.write_bytes(edited.read_bytes() + b"\n")
    changed = _expected()
    assert changed != payload["corpus_hash"]
    result = _load(payload, knowledge, expected=changed)
    assert (result.status, result.reason) == (LOAD_STALE, "corpus_hash_mismatch")


def test_a_mutated_header_hash_is_stale(payload, knowledge):
    broken = dict(payload, corpus_hash="0" * 64)
    assert (_load(broken, knowledge).status, _load(broken, knowledge).reason) == (LOAD_STALE, "corpus_hash_mismatch")


def test_a_different_model_or_dimension_than_the_pin_is_stale(payload, knowledge):
    other_model = vector_index.load_index(
        payload, knowledge, expected_corpus_hash=_expected(), model="gemini-embedding-2", dimensions=FAKE_DIMENSIONS
    )
    assert (other_model.status, other_model.reason) == (LOAD_STALE, "embedding_model_mismatch")
    other_dims = vector_index.load_index(
        payload, knowledge, expected_corpus_hash=_expected(), model=FAKE_MODEL, dimensions=768
    )
    assert (other_dims.status, other_dims.reason) == (LOAD_STALE, "dimensions_mismatch")


def test_a_changed_body_with_the_same_hash_header_is_caught_by_offsets(payload, knowledge):
    sections = list(knowledge.sections)
    target = next(i for i, s in enumerate(sections) if not s.is_profile)
    sections[target] = context.Section(label=sections[target].label, body="X" + sections[target].body)
    edited = context.Knowledge(sections=tuple(sections))
    assert _load(payload, edited).status == LOAD_STALE


def test_a_missing_label_is_stale(payload, knowledge):
    broken = copy.deepcopy(payload)
    broken["chunks"][0]["doc_label"] = "Writing / Not a real post"
    assert _load(broken, knowledge).reason == "doc_label_not_in_corpus"


def test_a_missing_chunk_is_stale(payload, knowledge):
    broken = copy.deepcopy(payload)
    broken["chunks"].pop()
    assert _load(broken, knowledge).reason == "chunk_set_differs_from_live_chunker"


# --- offsets, labels, dimensions ------------------------------------------------------


def test_every_chunk_maps_to_a_live_label_and_its_span_hashes_to_content_hash(payload, knowledge):
    import hashlib

    bodies = {s.label: s.body for s in knowledge.sections}
    for record in payload["chunks"]:
        body = bodies[record["doc_label"]]
        span = body[record["char_start"] : record["char_end"]]
        assert hashlib.sha256(span.encode("utf-8")).hexdigest() == record["content_hash"]


def test_every_span_lands_inside_its_file(payload):
    root = Path(vector_index.BASE_DIR).parent
    for record in payload["chunks"]:
        path = root / record["doc_path"]
        assert path.is_file() and record["doc_path"].startswith("backend/docs/")
        text = path.read_text(encoding="utf-8")
        bodies = {s.label: s.body for s in context.get_knowledge().sections}
        assert bodies[record["doc_label"]][record["char_start"] : record["char_end"]] in text


def test_chunks_cover_each_document_contiguously(payload, knowledge):
    by_doc = {}
    for record in payload["chunks"]:
        by_doc.setdefault(record["doc_label"], []).append(record)
    bodies = {s.label: s.body for s in knowledge.sections}
    for label, records in by_doc.items():
        assert [r["chunk_index"] for r in records] == list(range(records[0]["chunk_count"]))
        assert records[0]["char_start"] == 0 and records[-1]["char_end"] == len(bodies[label])
        for left, right in zip(records, records[1:]):
            assert left["char_end"] == right["char_start"]


def test_every_vector_has_the_header_dimension_and_model(payload):
    for record in payload["chunks"]:
        assert len(record["embedding"]) == payload["dimensions"] == record["dimensions"]
        assert record["embedding_model"] == payload["embedding_model"]


@pytest.mark.parametrize(
    "mutate, reason",
    [
        (lambda r: r["embedding"].pop(), "embedding_length"),
        (lambda r: r.update(dimensions=FAKE_DIMENSIONS + 1), "chunk_dimensions_differ_from_header"),
        (lambda r: r.update(embedding_model="other"), "chunk_model_differs_from_header"),
        (lambda r: r["embedding"].__setitem__(0, "x"), "embedding_not_numeric"),
        (lambda r: r["embedding"].__setitem__(0, float("nan")), "embedding_not_numeric"),
    ],
)
def test_a_bad_vector_is_invalid(payload, knowledge, mutate, reason):
    broken = copy.deepcopy(payload)
    mutate(broken["chunks"][2])
    assert (_load(broken, knowledge).status, _load(broken, knowledge).reason) == (LOAD_INVALID, reason)


def test_index_chunk_ids_are_the_runtime_chunk_ids(payload, knowledge):
    runtime = [c.chunk_id for c in retrieval._index_for(knowledge).chunks]
    assert [r["chunk_id"] for r in payload["chunks"]] == runtime


def test_profile_is_never_indexed_and_published_is_writing_only(payload):
    kinds = {r["doc_kind"] for r in payload["chunks"]}
    assert kinds == {"project", "writing"}
    for record in payload["chunks"]:
        if record["doc_kind"] == "project":
            assert record["published"] is None
        else:
            assert len(record["published"]) == 10 and record["published"][4] == "-"


# --- build: incremental and atomic -------------------------------------------------------


def test_a_rebuild_reuses_every_unchanged_vector(knowledge, payload):
    calls = []

    def embed(texts):
        calls.append(len(texts))
        return fake_embed_texts(texts)

    result = vector_index.build_payload(
        knowledge, embed, built_at="t", model=FAKE_MODEL, dimensions=FAKE_DIMENSIONS, previous=payload
    )
    assert (result.embedded, result.reused, calls) == (0, len(payload["chunks"]), [])


def test_a_changed_chunk_is_the_only_one_re_embedded(knowledge, payload):
    previous = copy.deepcopy(payload)
    previous["chunks"][4]["content_hash"] = "0" * 64
    result = vector_index.build_payload(
        knowledge, fake_embed_texts, built_at="t", model=FAKE_MODEL, dimensions=FAKE_DIMENSIONS, previous=previous
    )
    assert (result.embedded, result.reused) == (1, len(payload["chunks"]) - 1)


def test_a_different_model_re_embeds_everything(knowledge, payload):
    result = vector_index.build_payload(
        knowledge, lambda t: fake_embed_texts(t, 32), built_at="t", model="other", dimensions=32, previous=payload
    )
    assert result.reused == 0


def test_a_failed_write_leaves_the_old_file_and_no_temp(tmp_path, payload, monkeypatch):
    path = tmp_path / "chunks.v1.json"
    path.write_text("old", encoding="utf-8")

    def broken_replace(_src, _dst):
        raise OSError("disk full")

    monkeypatch.setattr(vector_index.os, "replace", broken_replace)
    with pytest.raises(OSError):
        vector_index.write_payload(str(path), payload)
    assert path.read_text(encoding="utf-8") == "old"
    assert os.listdir(tmp_path) == ["chunks.v1.json"]


# --- the committed index (CI staleness check) -----------------------------------------------


def test_the_committed_index_is_fresh_or_absent(knowledge):
    """CI: runs in the backend `Tests` step. Fails when a committed index is stale."""
    result = vector_index.check_committed(knowledge)
    assert result.ok, f"backend/index/chunks.v1.json is {result.status} ({result.reason}); rebuild it"
    if result.status == LOAD_MISSING:
        # Documented R2 state: the real index needs the live embedding step.
        assert not os.path.exists(vector_index.INDEX_PATH)


def _builder():
    # tools/ has no .gitignore of its own: keep bytecode out of the tree.
    sys.path.insert(0, str(TOOLS))
    previous, sys.dont_write_bytecode = sys.dont_write_bytecode, True
    try:
        import build_index
    finally:
        sys.dont_write_bytecode = previous
        sys.path.remove(str(TOOLS))
    return build_index


def test_the_builder_refuses_to_build_without_the_explicit_flag(monkeypatch, capsys):
    monkeypatch.setenv("GEMINI_API_KEY", "placeholder-not-a-key")
    assert _builder().main(["--build"]) == 2
    assert "allow-live-embedding" in capsys.readouterr().err


def test_the_builder_refuses_to_build_without_a_key_in_env(monkeypatch, capsys):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert _builder().main(["--build", "--allow-live-embedding"]) == 2
    assert "GEMINI_API_KEY is not set" in capsys.readouterr().err


def test_the_builder_check_and_dry_run_are_offline(fresh_corpus_cache, capsys):
    builder = _builder()
    assert builder.main(["--check"]) == 0
    assert builder.main(["--dry-run"]) == 0
    out = capsys.readouterr().out
    assert "No API call was made" in out
    assert not os.path.exists(vector_index.INDEX_PATH)


def test_the_builder_needs_exactly_one_mode():
    assert _builder().main([]) == 2


# --- golden rankings and determinism ------------------------------------------------------

# The lexical leg's held-out ranking, pinned at what R1 measures (13/18 and
# 14/18). A drop means the BM25 leg changed. Dense golden rankings need real
# query embeddings and are scored by measure_r2.py, not here.
GOLDEN_RECALL_AT_K = 13 / 18
GOLDEN_MRR = 14 / 18


def _held_out_narrowed():
    questions = json.loads((HERE / "retrieval_eval" / "questions.v1.json").read_text(encoding="utf-8"))["questions"]
    held = set(json.loads((HERE / "retrieval_eval" / "split.v1.json").read_text(encoding="utf-8"))["held_out"])
    for case in questions:
        expected = [label for label in case["expected_doc_labels"] if label not in CORE]
        if case["id"] in held and case["expected_outcome"] == "narrowed" and expected:
            yield case, expected


def test_golden_rankings_on_the_held_out_half(knowledge):
    recalls, reciprocal = [], []
    for case, expected in _held_out_narrowed():
        ranked = [h.chunk.doc_label for h in retrieval.retrieve(case["question"], knowledge).candidates]
        ranked = ranked[: retrieval.TOP_K_MAX]
        recalls.append(sum(label in ranked for label in expected) / len(expected))
        reciprocal.append(next((1.0 / i for i, label in enumerate(ranked, 1) if label in expected), 0.0))
    assert len(recalls) == 18
    assert sum(recalls) / len(recalls) >= GOLDEN_RECALL_AT_K - 1e-9
    assert sum(reciprocal) / len(reciprocal) >= GOLDEN_MRR - 1e-9


def test_bm25_order_is_deterministic_on_the_committed_corpus(knowledge):
    for case, _expected_labels in _held_out_narrowed():
        runs = [[h.chunk.chunk_id for h in retrieval.retrieve(case["question"], knowledge).candidates] for _ in range(3)]
        assert runs[0] == runs[1] == runs[2]
