"""Prints how selection does on QUESTIONS. Run from backend/: python tests/measure_routing.py [-v]

Costs nothing: no model is called. For each group it reports how often the
expected document was sent, and how many documents and roughly how many tokens
went with it.
"""

from __future__ import annotations

import os
import sys

# Run as a script, so the backend modules are one directory up.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import context  # noqa: E402
import selection  # noqa: E402
from routing_questions import OFF_TOPIC, QUESTIONS  # noqa: E402


def measure(verbose: bool = False) -> dict:
    groups: dict = {}
    for language, question, expected in QUESTIONS:
        knowledge = context.get_knowledge(language)
        chosen = selection.select(question, knowledge)
        sent = [(d["kind"], d["slug"]) for d in chosen.knowledge.documents]
        extra = [pair for pair in sent if pair[0] != "profile"]

        if expected is None:
            group, hit = "profile", True
        elif expected == OFF_TOPIC:
            group, hit = "off-topic", True
        else:
            group, hit = "document", expected in sent

        row = groups.setdefault(f"{language} {group}", {"n": 0, "hits": 0, "docs": 0, "tokens": 0})
        row["n"] += 1
        row["hits"] += hit
        row["docs"] += len(sent)
        row["tokens"] += chosen.knowledge.approx_tokens
        if verbose:
            mark = "ok  " if hit else "MISS"
            print(f"{mark} {chosen.outcome:14} {len(sent):2} | {question} | {[s for _, s in extra]}")
    return groups


if __name__ == "__main__":
    for name, row in sorted(measure(verbose="-v" in sys.argv).items()):
        n = row["n"]
        print(
            f"{name:14} {row['hits']:2}/{n:<2} reached   "
            f"{row['docs'] / n:4.1f} documents   ~{row['tokens'] // n:5} tokens"
        )
