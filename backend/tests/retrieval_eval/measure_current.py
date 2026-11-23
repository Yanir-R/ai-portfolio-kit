#!/usr/bin/env python3
"""Offline baseline of the current main selector (R0).

Exercises `context.get_knowledge` and `selection.select` against
`questions.v1.json`. No new retrieval code, no live Gemini calls, no installs.

Model / generation latency is NOT measured. Token figures are the repo's
`len(text) // CHARS_PER_TOKEN` estimate, not billed usage.

Run from the repo root or the backend directory:

    python3 backend/tests/retrieval_eval/measure_current.py
    python3 tests/retrieval_eval/measure_current.py
"""

from __future__ import annotations

import json
import statistics
import sys
import time
import types
from pathlib import Path
from typing import Any, Iterable, List, Sequence


# pypdf is imported by docs_helper at module load. The committed corpus is all
# markdown; this in-memory stub lets the script run without that package.
if "pypdf" not in sys.modules:
    _pypdf = types.ModuleType("pypdf")

    class _PdfReader:  # pragma: no cover - never used on the current corpus
        def __init__(self, _fh):
            self.pages: list = []

    _pypdf.PdfReader = _PdfReader
    sys.modules["pypdf"] = _pypdf


HERE = Path(__file__).resolve().parent
BACKEND = HERE.parents[1]
REPO = BACKEND.parent
QUESTIONS_PATH = HERE / "questions.v1.json"
RESULTS_JSON = REPO / "docs" / "plans" / "RAG-R0-BASELINE.json"

CORE_LABELS = frozenset({"Profile / about-me", "Profile / resume"})
REPEATS = 51
WARMUP = 3


def _ensure_backend_on_path() -> None:
    root = str(BACKEND)
    if root not in sys.path:
        sys.path.insert(0, root)


def _percentile(sorted_vals: Sequence[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    # Inclusive rank, matching the common "nearest-rank" feel for small N.
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


def _load_questions() -> list[dict[str, Any]]:
    payload = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return list(payload["questions"])


def _measure_select(select, question: str, knowledge, repeats: int = REPEATS) -> dict[str, Any]:
    for _ in range(WARMUP):
        select(question, knowledge)

    times: List[float] = []
    result = None
    for _ in range(repeats):
        t0 = time.perf_counter()
        result = select(question, knowledge)
        times.append(time.perf_counter() - t0)

    times_ms = [t * 1000.0 for t in times]
    ordered = sorted(times_ms)
    assert result is not None
    return {
        "result": result,
        "latency_ms_median": statistics.median(times_ms),
        "latency_ms_p95": _percentile(ordered, 95),
        "latency_ms_min": ordered[0],
        "latency_ms_max": ordered[-1],
        "repeats": repeats,
    }


def _metrics(selected: Iterable[str], expected: Sequence[str]) -> dict[str, Any]:
    selected_set = list(selected)
    selected_fs = frozenset(selected_set)
    expected_list = list(expected)
    expected_fs = frozenset(expected_list)
    found = [label for label in expected_list if label in selected_fs]
    allowed = expected_fs | CORE_LABELS
    unneeded = [label for label in selected_set if label not in allowed]
    recall = (len(found) / len(expected_list)) if expected_list else 1.0
    precision = (len([l for l in selected_set if l in allowed]) / len(selected_set)) if selected_set else 1.0
    return {
        "expected_found": found,
        "expected_missing": [label for label in expected_list if label not in selected_fs],
        "unneeded_labels": unneeded,
        "unneeded_count": len(unneeded),
        "recall": recall,
        "precision": precision,
        "core_only_selected": selected_fs <= CORE_LABELS and CORE_LABELS <= selected_fs,
    }


def aggregate(subset: list[dict[str, Any]]) -> dict[str, Any]:
    if not subset:
        return {}
    n = len(subset)
    recall_mean = sum(r["recall"] for r in subset) / n
    precision_mean = sum(r["precision"] for r in subset) / n
    unneeded_mean = sum(r["unneeded_count"] for r in subset) / n
    outcome_rate = sum(1 for r in subset if r["outcome_matches_desired"]) / n
    full_recall = sum(1 for r in subset if r["recall"] == 1.0) / n
    profile_tokens = [r["profile_token_estimate"] for r in subset]
    prompt_tokens = [r["system_prompt_token_estimate"] for r in subset]
    med = [r["latency_ms_median"] for r in subset]
    p95 = [r["latency_ms_p95"] for r in subset]
    outcomes: dict[str, int] = {}
    for r in subset:
        outcomes[r["actual_outcome"]] = outcomes.get(r["actual_outcome"], 0) + 1
    return {
        "n": n,
        "recall_macro": recall_mean,
        "precision_macro": precision_mean,
        "unneeded_docs_mean": unneeded_mean,
        "full_recall_rate": full_recall,
        "desired_outcome_rate": outcome_rate,
        "actual_outcomes": outcomes,
        "profile_tokens_median": statistics.median(profile_tokens),
        "profile_tokens_mean": sum(profile_tokens) / n,
        "profile_tokens_min": min(profile_tokens),
        "profile_tokens_max": max(profile_tokens),
        "system_prompt_tokens_median": statistics.median(prompt_tokens),
        "system_prompt_tokens_mean": sum(prompt_tokens) / n,
        "system_prompt_tokens_min": min(prompt_tokens),
        "system_prompt_tokens_max": max(prompt_tokens),
        "select_latency_ms_median_of_medians": statistics.median(med),
        "select_latency_ms_max_p95": max(p95),
        "select_latency_ms_p95_of_medians": _percentile(sorted(med), 95),
    }


def _outcome_matches(desired: str, actual: str, core_only_selected: bool) -> bool:
    """Whether a typed outcome is the desired one.

    `core_only` is met by the explicit CORE_ONLY outcome (R1 lexical), by
    CONVERSATIONAL, or by a NARROWED result that holds only the core (the R0
    selector has no core_only value). UNFOCUSED (send all) never meets it.
    """
    if desired == "core_only":
        return actual in {"core_only", "conversational"} or (actual == "narrowed" and core_only_selected)
    return actual == desired


def evaluate(select, questions: Sequence[dict[str, Any]], knowledge) -> dict[str, Any]:
    """Runs one selector over the eval set: per-question rows plus aggregates.

    `select(question, knowledge)` must return an object with `.knowledge`,
    `.outcome` and `.available` (selection.Selection). Shared by the R0
    baseline (`main` below) and the R1 comparison (`measure_r1.py`), so both
    phases are scored by exactly the same code.
    """
    import prompt
    from context import CHARS_PER_TOKEN

    rows: list[dict[str, Any]] = []
    for case in questions:
        measured = _measure_select(select, case["question"], knowledge)
        chosen = measured["result"]
        selected_labels = [s.label for s in chosen.knowledge.sections]
        profile_text = chosen.knowledge.text
        system_prompt = prompt.build_system_instruction(chosen.knowledge)
        scores = _metrics(selected_labels, case["expected_doc_labels"])
        desired = case["expected_outcome"]
        outcome_matches = _outcome_matches(desired, chosen.outcome, scores["core_only_selected"])
        rows.append(
            {
                "id": case["id"],
                "question": case["question"],
                "language": case["language"],
                "category": case["category"],
                "expected_doc_labels": case["expected_doc_labels"],
                "expected_outcome": desired,
                "selected_doc_labels": selected_labels,
                "actual_outcome": chosen.outcome,
                "outcome_matches_desired": outcome_matches,
                "available": chosen.available,
                "profile_chars": len(profile_text),
                "profile_token_estimate": len(profile_text) // CHARS_PER_TOKEN,
                "system_prompt_chars": len(system_prompt),
                "system_prompt_token_estimate": len(system_prompt) // CHARS_PER_TOKEN,
                "latency_ms_median": measured["latency_ms_median"],
                "latency_ms_p95": measured["latency_ms_p95"],
                "latency_ms_min": measured["latency_ms_min"],
                "latency_ms_max": measured["latency_ms_max"],
                "repeats": measured["repeats"],
                **scores,
            }
        )

    by_category = {}
    for row in rows:
        by_category.setdefault(row["category"], []).append(row)
    category_summary = {cat: aggregate(items) for cat, items in sorted(by_category.items())}

    misses = [
        {
            "id": r["id"],
            "category": r["category"],
            "language": r["language"],
            "question": r["question"],
            "actual_outcome": r["actual_outcome"],
            "expected_outcome": r["expected_outcome"],
            "recall": r["recall"],
            "precision": r["precision"],
            "expected_missing": r["expected_missing"],
            "unneeded_count": r["unneeded_count"],
            "unneeded_labels": r["unneeded_labels"],
            "selected_doc_labels": r["selected_doc_labels"],
        }
        for r in rows
        if r["recall"] < 1.0 or r["unneeded_count"] > 0 or not r["outcome_matches_desired"]
    ]
    worst = sorted(
        misses,
        key=lambda r: (r["recall"], -r["unneeded_count"], r["category"], r["id"]),
    )

    all_medians = [r["latency_ms_median"] for r in rows]
    all_p95 = [r["latency_ms_p95"] for r in rows]

    return {
        "n_questions": len(rows),
        "overall": aggregate(rows),
        "by_category": category_summary,
        "by_language": {
            lang: aggregate([r for r in rows if r["language"] == lang])
            for lang in ("en", "he")
        },
        "latency_all_questions": {
            "median_of_medians_ms": statistics.median(all_medians),
            "p95_of_medians_ms": _percentile(sorted(all_medians), 95),
            "max_median_ms": max(all_medians),
            "max_p95_ms": max(all_p95),
            "min_median_ms": min(all_medians),
        },
        "miss_and_imprecision_count": len(misses),
        "worst_misses": worst,
        "questions": rows,
    }


def main() -> int:
    _ensure_backend_on_path()
    import context
    import prompt
    import selection
    from context import CHARS_PER_TOKEN

    questions = _load_questions()

    t0 = time.perf_counter()
    knowledge = context.get_knowledge()
    load_ms = (time.perf_counter() - t0) * 1000.0
    if knowledge.is_empty:
        print("Corpus is empty; refusing to write a baseline.", file=sys.stderr)
        return 1

    corpus_labels = [s.label for s in knowledge.sections]
    full_sent_all = prompt.build_system_instruction(knowledge)
    evaluated = evaluate(selection.select, questions, knowledge)

    results = {
        "schema_version": "1",
        "measured_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "selector": "backend/selection.py:select on origin/main behaviour (this worktree, no retrieval changes)",
        "corpus_labels": corpus_labels,
        "corpus_section_count": len(corpus_labels),
        "corpus_approx_tokens": knowledge.approx_tokens,
        "send_all_system_prompt_token_estimate": len(full_sent_all) // CHARS_PER_TOKEN,
        "chars_per_token": CHARS_PER_TOKEN,
        "corpus_load_ms": load_ms,
        "repeats_per_question": REPEATS,
        "warmup_per_question": WARMUP,
        "generation_latency": "not measured; no live Gemini calls",
        "metric_notes": {
            "recall": "fraction of expected_doc_labels present in the selected PROFILE",
            "precision": "selected labels that are in expected_doc_labels or the always-allowed core, divided by selected count",
            "unneeded": "selected labels that are neither expected nor the two core profile documents",
            "tokens": "len(text) // CHARS_PER_TOKEN (repo constant 4), not provider usage",
            "latency": "time.perf_counter around selection.select only, after warmup; median and p95 over repeats",
        },
        **evaluated,
    }
    rows = evaluated["questions"]
    category_summary = evaluated["by_category"]

    RESULTS_JSON.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {RESULTS_JSON}")
    print(f"Corpus: {len(corpus_labels)} docs, ~{knowledge.approx_tokens} tokens, load {load_ms:.2f} ms")
    print(f"Questions: {len(rows)}")
    ov = results["overall"]
    print(
        f"Overall macro recall={ov['recall_macro']:.3f} precision={ov['precision_macro']:.3f} "
        f"unneeded_mean={ov['unneeded_docs_mean']:.2f} full_recall_rate={ov['full_recall_rate']:.3f} "
        f"desired_outcome_rate={ov['desired_outcome_rate']:.3f}"
    )
    print("By category:")
    for cat, agg in category_summary.items():
        print(
            f"  {cat:16} n={agg['n']:2d}  recall={agg['recall_macro']:.3f}  "
            f"prec={agg['precision_macro']:.3f}  unneeded={agg['unneeded_docs_mean']:.2f}  "
            f"outcomes={agg['actual_outcomes']}"
        )
    lat = results["latency_all_questions"]
    print(
        f"select() latency ms: median-of-medians={lat['median_of_medians_ms']:.3f} "
        f"p95-of-medians={lat['p95_of_medians_ms']:.3f} max-p95={lat['max_p95_ms']:.3f}"
    )
    print(f"Generation latency: {results['generation_latency']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
