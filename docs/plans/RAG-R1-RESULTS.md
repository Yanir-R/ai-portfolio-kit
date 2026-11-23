# R1 results: chunks + BM25 + Hebrew normaliser (lexical mode)

Status: **implemented locally, gate NOT met.** Phase R1 was approved by Yanir on
2026-11-23 (voice, 14:45 Asia/Jerusalem). The code is on the local branch
`plan/rag-retrieval-20261123` only: nothing pushed, no PR, no deploy, no
install, no live Gemini or other network call, no GCP or Cloudflare change.
`RETRIEVAL_MODE` is unset in every environment, so production behaviour is
unchanged (`selection.select` still serves every request).

Measured 2026-11-23, 15:02 Asia/Jerusalem, same corpus as R0 (10 documents,
~8,770 tokens). Machine-readable results: [`RAG-R1-RESULTS.json`](RAG-R1-RESULTS.json).
Harness: `backend/tests/retrieval_eval/measure_r1.py`, which reuses
`measure_current.evaluate` so R0 and R1 are scored by one code path.

## Result in one paragraph

On the held-out half, R1 lexical retrieval is **≥ R0 on 7 of 9 classes and
fails on two: `paraphrase` recall (0.875 → 0.625) and `multi_doc` recall
(0.833 → 0.722).** Everywhere else it is equal or better, often much better:
`no_word_match` desired-outcome rate 0.000 → 1.000, `off_topic` 0.333 → 1.000,
precision 0.729 → 0.936 overall, the six send-all requests are gone, and the
median PROFILE drops from ~4,445 to ~1,919 tokens. The Hebrew slice is
**unchanged** (recall 0.600 held-out, 0.500 full set), as expected: the corpus
has no Hebrew text, so a Hebrew-only question has nothing lexical to match.
The gate was not weakened and no eval label was changed.

## Gate: held-out half (the gate numbers)

Split: `backend/tests/retrieval_eval/split.v1.json`, committed (`e9980f5`)
before any R1 threshold was looked at. 25 tune / 30 held-out, stratified by
category. Rule: R1 ≥ R0 per category on recall, precision and desired-outcome
rate. ✗ marks a drop.

| Category | n | Recall R0 → R1 | Precision R0 → R1 | Desired-outcome R0 → R1 | Gate |
|---|---:|---|---|---|---|
| direct_keyword | 3 | 1.000 → 1.000 | 0.833 → 1.000 | 1.000 → 1.000 | pass |
| hebrew | 5 | 0.600 → 0.600 | 1.000 → 1.000 | 0.600 → 0.600 | pass |
| multi_doc | 3 | 0.833 → 0.722 ✗ | 0.767 → 0.767 | 1.000 → 1.000 | **FAIL** |
| no_word_match | 3 | 1.000 → 1.000 | 0.456 → 1.000 | 0.000 → 1.000 | pass |
| off_topic | 3 | 1.000 → 1.000 | 0.533 → 1.000 | 0.333 → 1.000 | pass |
| paraphrase | 4 | 0.875 → 0.625 ✗ | 0.725 → 1.000 | 0.750 → 0.750 | **FAIL** |
| profile | 3 | 1.000 → 1.000 | 0.622 → 0.889 | 0.333 → 0.667 | pass |
| project | 3 | 1.000 → 1.000 | 0.700 → 0.700 | 1.000 → 1.000 | pass |
| writing | 3 | 1.000 → 1.000 | 0.750 → 1.000 | 1.000 → 1.000 | pass |
| **overall** | 30 | 0.900 → 0.856 | 0.729 → 0.936 | 0.667 → 0.867 | **FAIL** |

## Full set, including the tuning half (for comparison with RAG-R0-BASELINE.md only)

| Category | n | Recall R0 → R1 | Precision R0 → R1 | Desired-outcome R0 → R1 | Gate |
|---|---:|---|---|---|---|
| direct_keyword | 6 | 1.000 → 1.000 | 0.758 → 1.000 | 0.833 → 1.000 | pass |
| hebrew | 10 | 0.500 → 0.500 | 0.975 → 0.975 | 0.500 → 0.500 | pass |
| multi_doc | 5 | 0.900 → 0.783 ✗ | 0.740 → 0.860 | 0.800 → 1.000 | **FAIL** |
| no_word_match | 5 | 1.000 → 1.000 | 0.507 → 1.000 | 0.000 → 1.000 | pass |
| off_topic | 5 | 1.000 → 1.000 | 0.600 → 0.880 | 0.400 → 0.800 | pass |
| paraphrase | 7 | 0.786 → 0.643 ✗ | 0.736 → 0.917 | 0.857 → 0.857 | **FAIL** |
| profile | 6 | 1.000 → 1.000 | 0.711 → 0.844 | 0.500 → 0.667 | pass |
| project | 5 | 1.000 → 1.000 | 0.820 → 0.820 | 1.000 → 1.000 | pass |
| writing | 6 | 1.000 → 1.000 | 0.738 → 0.958 | 1.000 → 1.000 | pass |
| **overall** | 55 | 0.873 → 0.844 | 0.754 → 0.923 | 0.655 → 0.836 | **FAIL** |

## Why the two classes fail

All three recall drops, with the cause of each. None is a Hebrew item.

| Question | Half | R0 | R1 | Cause |
|---|---|---|---|---|
| `q-en-paraphrase-01` "What have you written about evals?" | held-out | unfocused (all 10 docs), recall 1.0 | core_only, recall 0.0 | **Structural.** "evals" is in no document. R0 found the two posts only because it sent everything. R1 sends the core on a miss, which is the miss path Yanir decided on. Lexical retrieval cannot fix this one; the plan expects the dense leg (R2) to. |
| `q-en-multi-04` "What frontend stacks have you used, across your jobs and your own projects?" | held-out | narrowed, recall 1.0 | narrowed, recall 0.667 (missed `Project / AI Chat Portfolio`) | **Tuned parameter.** AI Chat Portfolio covers 0.40 of the question and ReelSensei 1.00, so `MIN_SHARE_OF_BEST = 0.5`, which was fitted on the tune half, drops it. |
| `q-en-multi-03` (incident investigation + empty tool responses) | tune | narrowed, recall 1.0 | narrowed, recall 0.75 (missed `Writing / "Nothing found."`) | **Inherited stemmer.** `_stem("responses")` is `respons` and `_stem("response")` is `response`, so they never meet. The plan keeps the English stemmer unchanged. |

**Sensitivity check, not adopted.** With `MIN_SHARE_OF_BEST = 0.0`, the
held-out `multi_doc` class passes (0.833 → 0.833) and `paraphrase` still fails
on the "evals" question. Precision on `direct_keyword`, `writing` and
`paraphrase` gets a little lower, but it stays above R0. Adopting 0.0 now would
mean fitting to the held-out half, so the committed value stays 0.5 and the
choice goes to Yanir (open question 2).

## What changed on individual questions (full set)

- **Send-all removed.** All six R0 `unfocused` requests are now narrowed or core-only:
  - `direct-01` "ReelSensei." and `multi-01` "projects." are fixed by the tokenizer, which no longer keeps a trailing period.
  - `profile-03` "Hermes.", `nomatch-05`, `offtopic-01` and `paraphrase-01` now go core-only.
- **The "keep the best match anyway" rule is gone.**
  - Four `no_word_match` and two `off_topic` questions that used to narrow to an unrelated post now send the core only.
  - `nomatch-01` to `05` all meet the desired outcome now (R0: 0 of 5).
- **Precision.** Mean unneeded documents per question fell from 1.53 to 0.33.
- **Unchanged misses:**
  - `paraphrase-04`: the coding-assistant cost question still misses the token-burn post.
  - `paraphrase-06`: still finds one of the two "nothing" posts.
  - The five Hebrew-only questions that want project or post documents.

## Tokens and latency

Token estimates are `len(text) // CHARS_PER_TOKEN` (4), the repo constant.

| | R0 | R1 lexical |
|---|---:|---:|
| PROFILE tokens, held-out (median / mean / max) | 4,445 / 4,314 / 8,770 | 1,919 / 2,397 / 4,546 |
| PROFILE tokens, full set (median / mean / max) | 4,103 / 4,007 / 8,770 | 2,058 / 2,520 / 4,546 |
| System prompt tokens, full set (median / mean) | 5,121 / 5,025 | 3,076 / 3,539 |
| Outcomes, full set | 41 narrowed, 8 conversational, 6 unfocused | 31 narrowed, 24 core_only |
| `select` latency, median of per-question medians | 0.009 ms | 0.077 ms |
| p95 of per-question medians | 0.013 ms | 0.107 ms |
| Worst per-question p95 | 0.018 ms | 0.143 ms |

How the numbers were measured:

- Latency is `time.perf_counter` around the select call only, after 3 warm-up calls and over 51 repeats per question, the same method as R0.
- The R1 numbers include the per-request corpus hash used as the index-cache key.
- Both selectors sit far inside the plan's in-process budget (section 6.2: p95 ≤ 15 ms for keyword-only retrieval). `test_lexical_retrieval_stays_inside_the_latency_budget` asserts that budget.
- **Generation latency was not measured.** No live Gemini calls were made.

Hebrew-only questions now report `core_only` instead of `conversational`. They
send the same two documents, but the outcome now says what happened: the
question had topical words and none of them matched.

## Tests

Full backend suite: **191 passed**, both with `RETRIEVAL_MODE` unset and with
`RETRIEVAL_MODE=lexical`. That is 93 existing tests, unchanged and none ported,
plus 98 new ones. Run with the pinned `requirements-dev.txt` versions; nothing
was installed. The repo's hygiene check (`.github/scripts/check_hygiene.sh`)
passes.

| File | Tests | Covers |
|---|---:|---|
| `tests/test_lexical.py` | 53 | <ul><li>English `_stem` unchanged.</li><li>Trailing-period fix, while `selection._terms` keeps the old behaviour.</li><li>Inner punctuation.</li><li>Niqqud, including that maqaf separates words.</li><li>All five final letters.</li><li>Prefixes, with fixtures `והפרויקטים` and `כשכתבת` plus every listed prefix.</li><li>Plural and possessive suffixes.</li><li>The 2-letter guard.</li><li>Hebrew stopwords and abbreviation quotes.</li><li>Trigram similarity.</li><li>Mixed `מה זה ReelSensei?` yielding both scripts.</li></ul> |
| `tests/test_chunking.py` | 13 | <ul><li>Spans rebuild the body exactly.</li><li>Determinism.</li><li>Heading paths, ignoring fenced code.</li><li>Cap and merge.</li><li>Schema fields.</li><li>The context prefix.</li><li>`doc_kind`.</li><li>Empty body and an enormous line.</li><li>Every committed document.</li></ul> |
| `tests/test_retrieval.py` | 32 | <ul><li>BM25 against the Okapi formula on a toy corpus.</li><li>Deterministic order and ties.</li><li>NARROWED, CORE_ONLY (no match, below the gate, core-covered), CONVERSATIONAL, follow-up framing and NO_CORPUS.</li><li>Profile always first.</li><li>Budget and top-k cut.</li><li>Grouping keeps the label and order and adds gap markers; `source_counts` unchanged.</li><li>Short documents sent whole.</li><li>An error degrades to CORE_ONLY, logging the type and location but not the text.</li><li>The audit line is JSON with no visitor words.</li><li>Hebrew end to end on a toy Hebrew corpus: prefix, two-letter prefix, niqqud, trigram fallback.</li><li>Mixed Hebrew and Latin; Hebrew words do not veto a Latin name; Hebrew-only over English text is core-only.</li><li>Committed corpus: the trailing period is fixed, and "evals" is an honest core-only miss.</li><li>The latency budget.</li><li>The flag: the default equals `selection.select`, lexical mode works, an unknown value warns once and falls back.</li><li>The email-only shortcut never calls retrieval.</li></ul> |

The section 9.4 tests for RRF ordering and the embedding-timeout fallback belong
to the dense leg and are R2 work; R1 has no dense leg to test.

## Design (as built)

- **`backend/lexical.py`** is the only tokenizer, used for both the question and the chunks.
  - English reuses `selection._STOPWORDS`, `MIN_TERM_LENGTH` and `_stem` by import, not by copy.
  - The Latin pattern never ends on `.` or `-`.
  - Hebrew follows section 6.1: NFKC, niqqud stripped (maqaf, paseq, sof pasuq and nun hafukha become spaces), final letters folded, one prefix and one suffix stripped with a 2-letter guard, and a closed-class stopword list.
  - Each Hebrew word carries two variants, the full stem and the suffix-only stem. "כתבת", "כשכתבת" and "כתבתי" share `כתב`, even though a light stemmer cannot tell a root כ from the prefix כ.
  - Trigram Dice similarity is the fallback for Hebrew terms (threshold 0.6, not tunable on this corpus).
- **`backend/chunking.py`** is deterministic and heading-aware.
  - It splits at h1–h3 outside code fences, merges chunks to at least 200 tokens and caps them at 800 (`CHUNKER_VERSION = "1"`).
  - Chunks are contiguous half-open spans of `Section.body` and carry the section 5.1 fields that exist without a file path.
  - The current corpus gives 22 retrievable chunks: median ~276 tokens, maximum 607.
- **`backend/retrieval.py`** does the scoring and assembly.
  - BM25 uses k1 1.2 and b 0.75 over the chunk text plus its `{doc_label} › {headings}` prefix. Ties break on corpus order, then `chunk_index`.
  - Documents are gated by their share of the question, weighted `log(N/df)` over whole documents, the R0 measure:
    - Words found only in the profile core count toward the question but not toward any chunk, so profile questions stay core-only.
    - Words in a script the index has no text in count zero, so Hebrew words neither help nor veto a Latin name.
    - Unknown words weigh `log(2N)`.
  - A document must reach `MIN_COVERAGE` (0.25, `selection.QUERY_COVERAGE`) and also `MIN_SHARE_OF_BEST` (0.5) of the best document's share.
  - Chunks then go in rank order up to a 3,000-token budget and 12 chunks. Documents of 500 tokens or less are sent whole.
  - Chunks are regrouped under their original label, in corpus order, with `[…]` between non-adjacent spans.
  - Outcomes are NARROWED, CORE_ONLY, CONVERSATIONAL and NO_CORPUS; UNFOCUSED is never produced. Each comes with a stable reason code.
  - The structured `Retrieval` result carries the `Selection` (the same type `main.py` already uses), the candidates, the chunks sent with BM25 and coverage, word-class counts, timings and token estimates.
  - Any exception gives CORE_ONLY with reason `retrieval_error`. The log records the exception type and `file:line`, never the message, which could carry a visitor's word.
  - One `Retrieval: {json}` INFO line per request, with no question text and no terms.
- **The flag.** `retrieval.select` reads `RETRIEVAL_MODE` per call. Unset gives `selection.select`. `lexical` gives R1. Any other value logs one warning and uses the default.
- **Wiring.** `main.py` changes one import; the email-only and contact branches still run before retrieval. `frontend/src/types/chat.ts` adds `'core_only'` to the outcome union. `TraceRail` already renders it as the plain document count, so no UI change was needed.

## Deviations from the plan

1. **`chunk_id` uses `doc_label`, not `doc_path`.** The section 5.1 schema hashes `doc_path`, but `Knowledge` carries only labels, and R1 has no persisted index. Fields that need the file are omitted in R1: `doc_path`, `doc_slug`, `doc_hash`, `published` and the embedding fields. The R2 builder, which reads files, can add them and re-derive ids.
2. **The gate is per document, then chunks are ranked.** The plan says "a chunk qualifies if it is in the BM25 top-M with a non-zero score". Chunk-level shares let one shared word pull in posts, which on the tune half made precision worse than R0. So documents are gated by their share of the question and BM25 ranks the chunks inside the documents that pass.
3. **Two thresholds were added and fitted on the tune half only:** `MIN_SHARE_OF_BEST = 0.5`, and the unknown-word weight `log(2N)`. The plan's own numbers were kept: k1 and b, the 3,000-token budget, top-k 12, the 500-token whole-document rule, the 200/800 chunk sizes and guard 2.
4. **Hebrew guard and trigram threshold were not tuned.** The plan says the guard should be "tuned on the eval set", but the corpus has zero Hebrew text, so no Hebrew eval question can match lexically. The guard stays at the proposed 2 and the trigram threshold at 0.6, both checked by fixtures only.
5. **Two variants per Hebrew word** (full stem and suffix-only stem) is an addition to the section 6.1 list. Without it, "כתבת" and "כשכתבת" do not meet.
6. **Feminine-plural possessive suffixes are not stripped** (כן, הן, תן). After final-letter folding they collide with every noun ending in ן; for example סוכן would become סו.
7. **The English stopword gap stays.** "now" is not on `selection._STOPWORDS`, so "Where do you work now?" still narrows to three posts in both R0 and R1. Fixing it means changing the shared list, which would move the R0 baseline.

## Open questions for Yanir

1. **The gate failed on `paraphrase` and `multi_doc` recall.** The paraphrase loss is the decided core-only miss path ("evals" was found only by send-all). Options:
   - (a) keep R1 as is and treat R2 (dense leg) as the fix;
   - (b) accept a relaxed R1 gate for `paraphrase`, since R2's gate requires being better on paraphrase anyway;
   - (c) stop.
2. **`MIN_SHARE_OF_BEST`:** keep 0.5 (fitted on the tune half; precision up, one held-out `multi_doc` miss) or drop it to 0 (that `multi_doc` miss goes away, slightly lower precision)? Choosing 0 now would use held-out information; the eval set would then need fresh held-out questions.
3. **Changing the English stemmer** would fix the `response`/`responses` miss. The plan says to keep the stemmer unchanged. Should it stay frozen until `selection.py` is retired in R3?
4. **Adding `now`** (and similar temporal adverbs) to the closed-class stopword list would also change the R0 selector.

## What was not done

- No push, PR, merge or deploy.
- `RETRIEVAL_MODE` was not set anywhere.
- No dense leg, embeddings, RRF, index file, builder or CI staleness check. Those are R2.
- No live calls and no answer-level spot checks.
- No README limitation update (that is R3).
- `selection.py` was not changed.
- No eval labels were changed.
- No frontend build or typecheck was run: the change is one TypeScript union member and `frontend/node_modules` is not installed.

## How to reproduce

From the repo root (needs the pinned dev requirements; the harness itself stubs `pypdf`):

```
python3 backend/tests/retrieval_eval/measure_r1.py            # held-out gate, writes RAG-R1-RESULTS.json
python3 backend/tests/retrieval_eval/measure_r1.py --split tune   # tuning view, prints only
cd backend && pytest
```

`measure_r1.py` refuses to run (exit 2) if `selection.select` no longer
reproduces the committed R0 rows.
