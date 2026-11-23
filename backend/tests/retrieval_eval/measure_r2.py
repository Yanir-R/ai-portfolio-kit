#!/usr/bin/env python3
"""R2 gate harness: hybrid (BM25 + dense + RRF) against the R1 lexical baseline.

Scores `retrieval.retrieve(..., mode="hybrid")` and the R1 lexical retriever
with the same `measure_current.evaluate` that scored R0 and R1, and reuses
`measure_r1._subset` for the per-category tables. The lexical rows are first
checked against the committed RAG-R1-RESULTS.json; a difference means R1
behaviour changed and the comparison would be void (exit 2).

Two modes, and only one of them is a quality result:

  --plumbing (default)  FAKE deterministic embeddings (tests/fake_embeddings.py:
                        hashed lexical terms, 64 dims) over an in-memory index of
                        the committed docs. Proves the hybrid path runs end to end
                        on the real corpus and eval set. NOT A QUALITY RESULT:
                        the fake vectors carry no meaning beyond shared words.
                        Writes docs/plans/RAG-R2-RESULTS.json with
                        "quality_result": false. No network.

  --real                The committed backend/index/chunks.v1.json (real
                        gemini-embedding-2 vectors) plus LIVE query embeddings.
                        Makes one embed call per distinct eval question (55;
                        repeats are LRU hits), so it refuses to run unless BOTH
                        --allow-live-embedding is given AND GEMINI_API_KEY is
                        set. Pending Yanir's OK on quota. Prints the R2 gate on
                        the held-out half and, with --tune, a sweep of RRF_K and
                        MIN_COSINE on the tune half that reuses the cached query
                        vectors (no further calls). It never edits code: fitted
                        values are printed for review.

R2 gate (plan section 9.1): on the held-out half, hybrid recall >= lexical
recall on every category, strictly better on `paraphrase` and `hebrew`, and no
regression on `profile` (recall, precision, desired-outcome rate).

Run from the repo root:

    python3 backend/tests/retrieval_eval/measure_r2.py
    python3 backend/tests/retrieval_eval/measure_r2.py --real --allow-live-embedding [--tune]
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))  # tests/: the fake embedding client

import measure_current as harness  # noqa: E402  (also installs the pypdf stub)
import measure_r1  # noqa: E402

R1_JSON = harness.REPO / "docs" / "plans" / "RAG-R1-RESULTS.json"
RESULTS_JSON = harness.REPO / "docs" / "plans" / "RAG-R2-RESULTS.json"

STRICTLY_BETTER = ("paraphrase", "hebrew")
NO_REGRESSION_ANY_METRIC = ("profile",)
EPSILON = 1e-9

PLUMBING_BANNER = "PLUMBING CHECK WITH FAKE EMBEDDINGS - NOT A QUALITY RESULT"


def _check_lexical_unchanged(rows: List[Dict[str, Any]]) -> List[str]:
    committed = json.loads(R1_JSON.read_text(encoding="utf-8"))["r1_questions"]
    stable = lambda row: {k: v for k, v in row.items() if "latency" not in k and k not in ("question", "repeats")}  # noqa: E731
    by_id = {row["id"]: stable(row) for row in committed}
    return [row["id"] for row in rows if by_id.get(row["id"]) != stable(row)]


def gate_r2(lexical: Dict[str, Any], hybrid: Dict[str, Any]) -> Dict[str, Any]:
    classes = {}
    for cat, base in lexical["by_category"].items():
        cand = hybrid["by_category"][cat]
        checks = {"recall_macro": {"lexical": base["recall_macro"], "hybrid": cand["recall_macro"],
                                   "pass": cand["recall_macro"] + EPSILON >= base["recall_macro"]}}
        if cat in STRICTLY_BETTER:
            checks["recall_macro"]["rule"] = "strictly better"
            checks["recall_macro"]["pass"] = cand["recall_macro"] > base["recall_macro"] + EPSILON
        if cat in NO_REGRESSION_ANY_METRIC:
            for metric in ("precision_macro", "desired_outcome_rate"):
                checks[metric] = {"lexical": base[metric], "hybrid": cand[metric],
                                  "pass": cand[metric] + EPSILON >= base[metric]}
        classes[cat] = {"n": base["n"], "checks": checks, "pass": all(c["pass"] for c in checks.values())}
    return {"pass": all(c["pass"] for c in classes.values()), "by_category": classes}


def _print(title: str, lexical: Dict[str, Any], hybrid: Dict[str, Any], gate: Dict[str, Any]) -> None:
    print(f"\n{title}")
    print(f"  {'category':16} {'n':>3}  {'recall lex/hyb':>15}  {'prec lex/hyb':>13}  {'outcome lex/hyb':>15}  gate")
    for cat, g in gate["by_category"].items():
        lx, hy = lexical["by_category"][cat], hybrid["by_category"][cat]
        print(
            f"  {cat:16} {g['n']:>3}  {lx['recall_macro']:.3f}/{hy['recall_macro']:.3f}    "
            f"{lx['precision_macro']:.3f}/{hy['precision_macro']:.3f}    "
            f"{lx['desired_outcome_rate']:.3f}/{hy['desired_outcome_rate']:.3f}    {'PASS' if g['pass'] else 'FAIL'}"
        )
    lx, hy = lexical["overall"], hybrid["overall"]
    print(
        f"  {'overall':16} {lx['n']:>3}  {lx['recall_macro']:.3f}/{hy['recall_macro']:.3f}    "
        f"{lx['precision_macro']:.3f}/{hy['precision_macro']:.3f}    "
        f"{lx['desired_outcome_rate']:.3f}/{hy['desired_outcome_rate']:.3f}    {'PASS' if gate['pass'] else 'FAIL'}"
    )


def _dense_statuses(retrieval, questions, knowledge, dense) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for case in questions:
        report = retrieval.retrieve(case["question"], knowledge, mode=retrieval.MODE_HYBRID, dense=dense).dense
        key = report.status if report else "not_run (conversational)"
        counts[key] = counts.get(key, 0) + 1
    return counts


def _tune(retrieval, harness_eval, questions, tune_ids, knowledge, dense) -> List[Dict[str, Any]]:
    """Sweep RRF_K x MIN_COSINE on the tune half only. Query vectors come from the LRU."""
    rows = []
    original = (retrieval.RRF_K, retrieval.MIN_COSINE)
    tune_questions = [q for q in questions if q["id"] in tune_ids]
    lexical = measure_r1._subset(
        harness_eval(lambda q, k: retrieval.retrieve(q, k).selection, tune_questions, knowledge), tune_ids
    )
    try:
        for k_rrf in range(2, 11):
            for step in range(16):
                retrieval.RRF_K, retrieval.MIN_COSINE = k_rrf, round(0.50 + 0.02 * step, 2)
                hybrid = measure_r1._subset(
                    harness_eval(lambda q, k: retrieval.retrieve(q, k, mode=retrieval.MODE_HYBRID, dense=dense).selection,
                                 tune_questions, knowledge),
                    tune_ids,
                )
                gate = gate_r2(lexical, hybrid)
                rows.append({"RRF_K": retrieval.RRF_K, "MIN_COSINE": retrieval.MIN_COSINE, "tune_gate": gate["pass"],
                             "recall": hybrid["overall"]["recall_macro"], "precision": hybrid["overall"]["precision_macro"],
                             "outcome": hybrid["overall"]["desired_outcome_rate"]})
    finally:
        retrieval.RRF_K, retrieval.MIN_COSINE = original
    rows.sort(key=lambda r: (not r["tune_gate"], -r["outcome"], -r["recall"], -r["precision"], r["RRF_K"], r["MIN_COSINE"]))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--plumbing", action="store_true", help="fake embeddings (default)")
    mode.add_argument("--real", action="store_true", help="real index + live query embeddings")
    parser.add_argument("--allow-live-embedding", action="store_true")
    parser.add_argument("--tune", action="store_true", help="with --real: sweep RRF_K and MIN_COSINE on the tune half")
    parser.add_argument("--record-tests", default="", help='e.g. "unset=286,lexical=286,hybrid=286" (stored in the JSON)')
    args = parser.parse_args()

    harness._ensure_backend_on_path()
    logging.getLogger().setLevel(logging.WARNING)
    import context
    import embedding
    import retrieval
    import vector_index

    questions = harness._load_questions()
    split = json.loads(measure_r1.SPLIT_PATH.read_text(encoding="utf-8"))
    held, tune_ids = set(split["held_out"]), set(split["tune"])
    knowledge = context.get_knowledge()
    if knowledge.is_empty:
        print("Corpus is empty; refusing to measure.", file=sys.stderr)
        return 1

    if args.real:
        if not args.allow_live_embedding:
            print("Refusing: --real makes live embedding calls (quota). Add --allow-live-embedding once approved.",
                  file=sys.stderr)
            return 2
        if not os.getenv(embedding.API_KEY_ENV):
            print(f"Refusing: {embedding.API_KEY_ENV} is not set in this environment.", file=sys.stderr)
            return 2
        load = vector_index.load_runtime_index(knowledge)
        if not load.ok:
            print(f"Refusing: committed index is {load.status} ({load.reason}). Build it first.", file=sys.stderr)
            return 2
        embedder = embedding.QueryEmbedder(client_factory=embedding.gemini_client)
        dense = retrieval.DenseResources(loader=lambda _k: load, embedder=embedder)
        label = "REAL INDEX + LIVE QUERY EMBEDDINGS"
    else:
        from fake_embeddings import FAKE_DIMENSIONS, committed_corpus_dense, fake_embedder

        embedder = fake_embedder(dimensions=FAKE_DIMENSIONS)
        dense = committed_corpus_dense(knowledge, embedder)
        label = PLUMBING_BANNER
    print(f"== {label} ==")

    lexical_all = harness.evaluate(lambda q, k: retrieval.retrieve(q, k).selection, questions, knowledge)
    changed = _check_lexical_unchanged(lexical_all["questions"])
    if changed:
        print(f"R1 lexical behaviour differs from RAG-R1-RESULTS.json on: {changed}", file=sys.stderr)
        return 2

    # Cache-miss latency: the first embedding of each distinct question.
    misses = []
    for case in questions:
        if not embedder.cached(case["question"]):
            result = embedder.embed(case["question"])
            misses.append({"status": result.status, "ms": result.elapsed_ms})
    hybrid_all = harness.evaluate(
        lambda q, k: retrieval.retrieve(q, k, mode=retrieval.MODE_HYBRID, dense=dense).selection, questions, knowledge
    )

    lex_held, hyb_held = measure_r1._subset(lexical_all, held), measure_r1._subset(hybrid_all, held)
    gate_held = gate_r2(lex_held, hyb_held)
    _print(f"held-out half (n={len(held)}) [{label}]", lex_held, hyb_held, gate_held)
    statuses = _dense_statuses(retrieval, questions, knowledge, dense)
    print(f"\ndense leg status over the full set: {statuses}")
    miss_ms = sorted(m["ms"] for m in misses if m["status"] == embedding.STATUS_OK)
    miss_summary = {
        "n": len(misses),
        "ok": len(miss_ms),
        "median_ms": harness._percentile(miss_ms, 50) if miss_ms else None,
        "p95_ms": harness._percentile(miss_ms, 95) if miss_ms else None,
        "note": "fake client: in-process, not network latency" if not args.real else "live embed_content calls",
    }

    if args.real:
        if args.tune:
            print("\nTune-half sweep (top 10; nothing is written):")
            for row in _tune(retrieval, harness.evaluate, questions, tune_ids, knowledge, dense)[:10]:
                print(f"  {row}")
        print(f"\nReal-mode gate (held-out): {'PASS' if gate_held['pass'] else 'FAIL'}. Nothing written; "
              "record the result in RAG-R2-RESULTS.md by hand after review.")
        return 0

    tests = {k.strip(): int(v) for k, v in (item.split("=", 1) for item in args.record_tests.split(",") if "=" in item)}
    results = {
        "schema_version": "1",
        "measured_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "phase": "R2",
        "status": "implemented locally; R2 gate NOT evaluated (needs a real index and live query embeddings)",
        "quality_result": False,
        "eval_mode": "plumbing",
        "eval_mode_note": PLUMBING_BANNER + ". Fake vectors are signed feature hashes of the lexical terms "
        "(tests/fake_embeddings.py, 64 dims); they prove the hybrid path runs on the committed corpus "
        "and eval set, not that dense retrieval helps.",
        "embedding": {"model": embedder.model, "dimensions": embedder.dimensions,
                      "production_pin": {"model": embedding.EMBEDDING_MODEL, "dimensions": embedding.DIMENSIONS}},
        "parameters": {
            "RRF_K": retrieval.RRF_K, "MIN_COSINE": retrieval.MIN_COSINE,
            "QUERY_TIMEOUT_MS": embedding.QUERY_TIMEOUT_MS, "QUERY_CACHE_SIZE": embedding.QUERY_CACHE_SIZE,
            "provisional": ["RRF_K", "MIN_COSINE"],
            "unchanged_from_r1": {n: getattr(retrieval, n) for n in (
                "BM25_K1", "BM25_B", "MIN_COVERAGE", "MIN_SHARE_OF_BEST", "RETRIEVAL_TOKEN_BUDGET", "TOP_K_MAX",
                "WHOLE_DOC_TOKENS", "TRIGRAM_MIN_SIMILARITY")},
        },
        "indexed_chunks": len(vector_index.indexed_chunks(knowledge)),
        "corpus_hash_production_pins": vector_index.corpus_hash(),
        "committed_index": vector_index.check_committed(knowledge).status,
        "r1_lexical_rows_verified_against": "docs/plans/RAG-R1-RESULTS.json",
        "tests": tests or None,
        "plumbing_held_out": {"lexical": lex_held, "hybrid_fake": hyb_held,
                              "gate_shape_only_not_a_result": gate_held},
        "plumbing_dense_status_full_set": statuses,
        "plumbing_query_embed_miss": miss_summary,
        "plumbing_latency_ms": {
            "lexical": lexical_all["latency_all_questions"],
            "hybrid_fake_cache_hit": hybrid_all["latency_all_questions"],
            "note": "time.perf_counter around the select call, after warm-up; query embeddings are LRU hits",
        },
        "pending_for_yanir": [
            "OK on embedding quota + a key in the builder's shell env: "
            "python3 tools/build_index.py --build --allow-live-embedding",
            "Commit backend/index/chunks.v1.json (CI then enforces freshness)",
            "Run the R2 gate: python3 backend/tests/retrieval_eval/measure_r2.py --real --allow-live-embedding --tune",
            "Fit RRF_K and MIN_COSINE on the tune half only; report the gate on the held-out half",
            "The four open R1 decisions (RAG-R1-RESULTS.md, Open questions)",
        ],
    }
    RESULTS_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {RESULTS_JSON} (quality_result: false)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
