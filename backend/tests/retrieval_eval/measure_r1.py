#!/usr/bin/env python3
"""R1 gate: the R0 harness run on both selectors, side by side (offline).

Scores `selection.select` (the R0 baseline, unchanged) and the R1 lexical
retriever (`retrieval.retrieve`, what `RETRIEVAL_MODE=lexical` serves) with the
same `measure_current.evaluate`, so both are measured by one code path.

The eval set's tune / held-out split (`split.v1.json`) was committed before
any R1 threshold was looked at. Gate numbers are the held-out half (plan
section 9.1: never report final numbers on the tuning half). Full-set numbers
are printed beside them for comparison with RAG-R0-BASELINE.md, and are marked
as including the tuning half.

Before scoring, the baseline's per-question results are checked against the
committed RAG-R0-BASELINE.json (everything except timings). A difference means
selection.py changed behaviour and the comparison would be void.

No network, no Gemini, no installs. Run from the repo root:

    python3 backend/tests/retrieval_eval/measure_r1.py            # write results
    python3 backend/tests/retrieval_eval/measure_r1.py --split tune   # print only
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent))

import measure_current as harness  # noqa: E402  (also installs the pypdf stub)

SPLIT_PATH = harness.HERE / "split.v1.json"
R0_JSON = harness.REPO / "docs" / "plans" / "RAG-R0-BASELINE.json"
RESULTS_JSON = harness.REPO / "docs" / "plans" / "RAG-R1-RESULTS.json"

GATE_METRICS = ("recall_macro", "precision_macro", "desired_outcome_rate")
# Float noise only; any real drop fails.
EPSILON = 1e-9


def _volatile(key: str) -> bool:
    return key.startswith("latency")


def _check_baseline_unchanged(rows: List[Dict[str, Any]]) -> List[str]:
    committed = json.loads(R0_JSON.read_text(encoding="utf-8"))["questions"]
    stable = lambda row: {k: v for k, v in row.items() if not _volatile(k)}  # noqa: E731
    by_id = {row["id"]: stable(row) for row in committed}
    return [row["id"] for row in rows if by_id.get(row["id"]) != stable(row)]


def _subset(evaluated: Dict[str, Any], ids: set) -> Dict[str, Any]:
    rows = [r for r in evaluated["questions"] if r["id"] in ids]
    by_category: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        by_category.setdefault(row["category"], []).append(row)
    return {
        "n": len(rows),
        "overall": harness.aggregate(rows),
        "by_category": {cat: harness.aggregate(items) for cat, items in sorted(by_category.items())},
        "by_language": {
            lang: harness.aggregate([r for r in rows if r["language"] == lang]) for lang in ("en", "he")
        },
    }


def _gate(baseline: Dict[str, Any], lexical: Dict[str, Any]) -> Dict[str, Any]:
    classes = {}
    for cat, r0 in baseline["by_category"].items():
        r1 = lexical["by_category"][cat]
        checks = {m: {"r0": r0[m], "r1": r1[m], "pass": r1[m] + EPSILON >= r0[m]} for m in GATE_METRICS}
        classes[cat] = {"n": r0["n"], "checks": checks, "pass": all(c["pass"] for c in checks.values())}
    return {"pass": all(c["pass"] for c in classes.values()), "by_category": classes}


def _diagnostics(retrieval, questions, knowledge) -> Dict[str, Any]:
    """Why each question got its outcome (reason, word classes, chunks). No timings."""
    out = {}
    for case in questions:
        record = retrieval.retrieve(case["question"], knowledge).log_record()
        record.pop("timings_ms", None)
        out[case["id"]] = record
    return out


def _print_table(title: str, baseline: Dict[str, Any], lexical: Dict[str, Any], gate: Dict[str, Any]) -> None:
    print(f"\n{title}")
    print(f"  {'category':16} {'n':>3}  {'recall R0/R1':>13}  {'prec R0/R1':>13}  {'outcome R0/R1':>13}  gate")
    for cat, g in gate["by_category"].items():
        c = g["checks"]
        print(
            f"  {cat:16} {g['n']:>3}  "
            f"{c['recall_macro']['r0']:.3f}/{c['recall_macro']['r1']:.3f}  "
            f"{c['precision_macro']['r0']:.3f}/{c['precision_macro']['r1']:.3f}  "
            f"{c['desired_outcome_rate']['r0']:.3f}/{c['desired_outcome_rate']['r1']:.3f}  "
            f"{'PASS' if g['pass'] else 'FAIL'}"
        )
    for name, part in (("overall", "overall"),):
        b, l = baseline[part], lexical[part]
        print(
            f"  {name:16} {b['n']:>3}  {b['recall_macro']:.3f}/{l['recall_macro']:.3f}  "
            f"{b['precision_macro']:.3f}/{l['precision_macro']:.3f}  "
            f"{b['desired_outcome_rate']:.3f}/{l['desired_outcome_rate']:.3f}  "
            f"{'PASS' if gate['pass'] else 'FAIL'}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--split", choices=("held_out", "tune"), default="held_out")
    args = parser.parse_args()

    harness._ensure_backend_on_path()
    # The retriever logs one INFO line per call; the harness measures it with
    # logging at WARNING, as an unconfigured process would run.
    logging.getLogger().setLevel(logging.WARNING)
    import context
    import retrieval
    import selection

    questions = harness._load_questions()
    split = json.loads(SPLIT_PATH.read_text(encoding="utf-8"))
    ids = set(split[args.split])
    knowledge = context.get_knowledge()
    if knowledge.is_empty:
        print("Corpus is empty; refusing to measure.", file=sys.stderr)
        return 1

    baseline_all = harness.evaluate(selection.select, questions, knowledge)
    changed = _check_baseline_unchanged(baseline_all["questions"])
    if changed:
        print(f"selection.py behaviour differs from RAG-R0-BASELINE.json on: {changed}", file=sys.stderr)
        return 2

    lexical_all = harness.evaluate(lambda q, k: retrieval.retrieve(q, k).selection, questions, knowledge)

    baseline_part, lexical_part = _subset(baseline_all, ids), _subset(lexical_all, ids)
    gate_part = _gate(baseline_part, lexical_part)
    _print_table(f"{args.split} half (n={len(ids)})", baseline_part, lexical_part, gate_part)

    if args.split == "tune":
        diagnostics = _diagnostics(retrieval, [q for q in questions if q["id"] in ids], knowledge)
        for qid, rec in diagnostics.items():
            print(f"  {qid:22} {rec['outcome']:14} {rec['reason']:20} words={rec['words']} docs={[d[:24] for d in rec['docs_sent'] if not d.startswith('Profile')]}")
        return 0

    full_ids = {q["id"] for q in questions}
    baseline_full, lexical_full = _subset(baseline_all, full_ids), _subset(lexical_all, full_ids)
    gate_full = _gate(baseline_full, lexical_full)
    _print_table(f"full set incl. tune half (n={len(full_ids)})", baseline_full, lexical_full, gate_full)

    for name, ev in (("R0 selection", baseline_all), ("R1 lexical", lexical_all)):
        lat = ev["latency_all_questions"]
        ov = ev["overall"]
        print(
            f"\n{name}: latency median-of-medians={lat['median_of_medians_ms']:.3f} ms "
            f"p95-of-medians={lat['p95_of_medians_ms']:.3f} ms max-p95={lat['max_p95_ms']:.3f} ms; "
            f"PROFILE tokens median={ov['profile_tokens_median']} mean={ov['profile_tokens_mean']:.0f} "
            f"max={ov['profile_tokens_max']}; outcomes={ov['actual_outcomes']}"
        )

    results = {
        "schema_version": "1",
        "measured_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "phase": "R1",
        "selectors": {
            "r0": "selection.select (unchanged; per-question results verified against RAG-R0-BASELINE.json)",
            "r1": "retrieval.retrieve, served when RETRIEVAL_MODE=lexical",
        },
        "parameters": {
            name: getattr(retrieval, name)
            for name in (
                "BM25_K1", "BM25_B", "MIN_COVERAGE", "MIN_SHARE_OF_BEST", "RETRIEVAL_TOKEN_BUDGET", "TOP_K_MAX",
                "WHOLE_DOC_TOKENS", "TRIGRAM_MIN_SIMILARITY",
            )
        },
        "unknown_word_weight": "log(2 * N_docs)",
        "hebrew_min_stem_length": __import__("lexical").HEBREW_MIN_STEM_LENGTH,
        "fitted_on_tune_half": ["MIN_SHARE_OF_BEST", "unknown_word_weight"],
        "chunker_version": __import__("chunking").CHUNKER_VERSION,
        "retrievable_chunks": len(retrieval._index_for(knowledge).chunks),
        "split": {"file": "backend/tests/retrieval_eval/split.v1.json", "gate_half": "held_out",
                  "tune": len(split["tune"]), "held_out": len(split["held_out"])},
        "gate_metrics": list(GATE_METRICS),
        "gate_rule": "per category, R1 >= R0 on every gate metric, held-out half",
        "gate_held_out": gate_part,
        "gate_full_set_including_tune": gate_full,
        "held_out": {"r0": baseline_part, "r1": lexical_part},
        "full_set_including_tune": {"r0": baseline_full, "r1": lexical_full},
        "latency_ms": {
            "r0": baseline_all["latency_all_questions"],
            "r1": lexical_all["latency_all_questions"],
            "note": "time.perf_counter around the select call only, after warm-up; no model latency",
        },
        "generation_latency": "not measured; no live Gemini calls",
        "r1_diagnostics": _diagnostics(retrieval, questions, knowledge),
        "r1_questions": [
            {k: v for k, v in row.items() if k not in ("question",)} for row in lexical_all["questions"]
        ],
    }
    RESULTS_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {RESULTS_JSON}")
    print(f"Gate (held-out): {'PASS' if gate_part['pass'] else 'FAIL'}; full set: {'PASS' if gate_full['pass'] else 'FAIL'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
