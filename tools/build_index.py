#!/usr/bin/env python3
"""Offline builder and checker for backend/index/chunks.v1.json (plan phase R2).

Modes (exactly one):

  --check     Offline staleness check: recompute corpus_hash from the docs and
              validate the committed index (schema, hash, dimensions, offsets).
              No network, no key. Exit 0 when fresh or when no index is
              committed yet; 1 when a committed index is stale or invalid.
  --dry-run   Print what a build would index (chunk count, tokens, corpus hash,
              how many chunks would need embedding). No network, writes nothing.
  --build     Embed new or changed chunks with gemini-embedding-2 and write the
              index atomically. Makes LIVE API calls that use embedding quota,
              so it refuses to run unless BOTH --allow-live-embedding is given
              AND GEMINI_API_KEY is set in this shell's environment. The key is
              read from the environment only and is never printed or written.

Run from the repo root with the backend's dev requirements installed:

  python3 tools/build_index.py --check
  python3 tools/build_index.py --dry-run
  GEMINI_API_KEY=... python3 tools/build_index.py --build --allow-live-embedding

Exit codes: 0 ok, 1 check failed / build failed, 2 refused (usage or missing
explicit approval flag / key).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
BACKEND = REPO / "backend"
sys.path.insert(0, str(BACKEND))

EXIT_OK, EXIT_FAILED, EXIT_REFUSED = 0, 1, 2


def _knowledge():
    import context

    knowledge = context.get_knowledge()
    if knowledge.is_empty:
        print("Corpus is empty; nothing to index.", file=sys.stderr)
        raise SystemExit(EXIT_FAILED)
    return knowledge


def _previous(path: str):
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return None


def _check() -> int:
    import vector_index

    result = vector_index.check_committed(_knowledge())
    rel = os.path.relpath(vector_index.INDEX_PATH, REPO)
    if result.status == vector_index.LOAD_MISSING:
        print(f"{rel}: not committed yet. Hybrid mode serves BM25 only until a real index is built.")
    elif result.ok:
        print(f"{rel}: fresh (corpus_hash matches the live docs; schema, dimensions and offsets valid).")
    else:
        print(f"{rel}: {result.status} ({result.reason}). Rebuild with --build --allow-live-embedding.", file=sys.stderr)
    return EXIT_OK if result.ok else EXIT_FAILED


def _dry_run() -> int:
    import vector_index

    knowledge = _knowledge()
    chunks = vector_index.indexed_chunks(knowledge)
    vector_index.document_records(knowledge)  # fails loudly if a doc maps to no file
    from context import CHARS_PER_TOKEN

    reusable = vector_index.reusable_vectors(_previous(vector_index.INDEX_PATH))
    to_embed = vector_index.chunks_to_embed(chunks, reusable)
    tokens = sum(len(vector_index.embedding_text(c)) // CHARS_PER_TOKEN for c in to_embed)
    print(f"corpus_hash      {vector_index.corpus_hash()}")
    print(f"embedding        {vector_index.EMBEDDING_MODEL} @ {vector_index.DIMENSIONS} dims")
    print(f"chunks indexed   {len(chunks)} (project and writing; profile is the always-sent core)")
    print(f"would embed      {len(to_embed)} chunks, ~{tokens} tokens; reuse {len(chunks) - len(to_embed)}")
    print("No API call was made and nothing was written.")
    return EXIT_OK


def _build(allow_live: bool) -> int:
    import embedding
    import vector_index

    if not allow_live:
        print(
            "Refusing to build: --build makes live embedding calls (quota). "
            "Re-run with --allow-live-embedding once that is approved.",
            file=sys.stderr,
        )
        return EXIT_REFUSED
    if not os.getenv(embedding.API_KEY_ENV):
        print(f"Refusing to build: {embedding.API_KEY_ENV} is not set in this environment.", file=sys.stderr)
        return EXIT_REFUSED

    knowledge = _knowledge()
    # Document calls get a generous per-call timeout; this is not the request path.
    client = embedding.gemini_client(timeout_ms=60_000)
    if client is None:
        print("Refusing to build: no embedding client could be created.", file=sys.stderr)
        return EXIT_REFUSED

    def embed(texts):
        return embedding.embed_documents(client, texts)

    try:
        result = vector_index.build_payload(
            knowledge,
            embed,
            built_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            previous=_previous(vector_index.INDEX_PATH),
        )
        # Validate exactly as the runtime will before replacing anything.
        check = vector_index.load_index(
            result.payload, knowledge, expected_corpus_hash=vector_index.corpus_hash()
        )
        if not check.ok:
            print(f"Built index failed validation ({check.status}: {check.reason}); nothing written.", file=sys.stderr)
            return EXIT_FAILED
        vector_index.write_payload(vector_index.INDEX_PATH, result.payload)
    except Exception as exc:  # report type and location only, never a message that may echo input
        print(f"Build failed ({type(exc).__name__} at {embedding.where(exc)}); old index untouched.", file=sys.stderr)
        return EXIT_FAILED
    print(
        f"Wrote {os.path.relpath(vector_index.INDEX_PATH, REPO)}: "
        f"{result.embedded} chunks embedded, {result.reused} reused."
    )
    return EXIT_OK


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true")
    group.add_argument("--dry-run", action="store_true")
    group.add_argument("--build", action="store_true")
    parser.add_argument("--allow-live-embedding", action="store_true")
    try:
        args = parser.parse_args(argv)
    except SystemExit as exit_:
        return EXIT_REFUSED if exit_.code else EXIT_OK
    if args.check:
        return _check()
    if args.dry_run:
        return _dry_run()
    return _build(args.allow_live_embedding)


if __name__ == "__main__":
    raise SystemExit(main())
