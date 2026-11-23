# R3 preparation: turning hybrid retrieval on by default

Status: **PREPARATION ONLY.** Written 2026-11-23 under Yanir's approval of R2 (offline) plus R3
prep (voice, 15:09 Asia/Jerusalem). No code default was changed, no flag was set anywhere, the
README was not edited, and nothing was deployed. R3 itself is a Tier 3 deploy and needs Yanir's
explicit go-ahead.

## 1. What must be true before R3 starts

All of these, in this order:

1. **A real index is committed.** `backend/index/chunks.v1.json` has been built with
   `gemini-embedding-2` at 768 dims through `tools/build_index.py --build --allow-live-embedding`,
   after Yanir's OK on quota and with a key in the builder's own shell. `python3
   tools/build_index.py --check` prints `fresh`, and CI's
   `test_the_committed_index_is_fresh_or_absent` passes on the PR.
2. **The R2 gate passed on real embeddings.** `measure_r2.py --real --allow-live-embedding` was
   run with `RRF_K` and `MIN_COSINE` fitted on the tune half only. On the held-out half: hybrid
   recall ≥ lexical on every category, strictly better on `paraphrase` and `hebrew`, and no
   regression on `profile` (recall, precision, desired-outcome rate). The query-embedding cache
   miss p95 is inside the 800 ms timeout. The results are recorded in `RAG-R2-RESULTS.md`.
3. **Yanir's decisions are recorded:**
   - R1 decision 1 is answered (keep R1, R2 is the fix).
   - Still open: `MIN_SHARE_OF_BEST` 0.5 or 0; English stemmer frozen until `selection.py` is
     retired; `now` and similar words on the stopword list.
   - The 3,500 vs 3,000 retrieved-token budget.
   - Whether `selection.py` is retired in R3 or kept as a comparison baseline. It is never a
     send-all fallback.
   - Whether the optional "more detail" offset is in R3 or deferred.
4. **Production can make query-embedding calls.** The service already has `GEMINI_API_KEY` from
   Secret Manager (`--set-secrets`), and `embedding.gemini_client()` reads the same variable, so
   no new secret is needed. Embedding calls count against `gemini-embedding-2`'s own per-model
   rate limits (plan P6). Yanir confirms the project's tier and that quota covers about one embed
   call per distinct visitor question.
5. **Push / PR / merge of the R1 and R2 branch** is approved separately. CI `verify` is green.

## 2. Exact steps to flip the default

Two equivalent ways. **A is recommended**, because the deploy workflow's `--set-env-vars` line
replaces every env var on each deploy, so a value set by hand on the service would be wiped by the
next deploy.

### A. Code default (one line)

`backend/retrieval.py`:

```python
# before
DEFAULT_MODE = MODE_SELECTION
# after
DEFAULT_MODE = MODE_HYBRID
```

Port the tests that pin today's default, and record why:

- `test_retrieval.py::test_the_default_mode_is_todays_selector` and
  `test_hybrid.py::test_the_default_is_still_todays_selector` become "the default is hybrid", and
  "`RETRIEVAL_MODE=selection` still serves `selection.select`".
- `test_retrieval.py::test_an_unknown_mode_falls_back_to_the_default_and_warns_once` asserts
  against `selection.select`. Point it at the hybrid default.
- `test_selection.py` and the main endpoint tests: confirm they still pass with the new default.
  They call `selection.select` directly or go through `main.select`. Run the suite with
  `RETRIEVAL_MODE` unset.

Update `frontend/src/types/chat.ts`: the `unfocused` comment becomes "only from the retired
selector (`RETRIEVAL_MODE=selection`)". Keep the union member while the selector exists.

### B. Environment only (no code change)

Add `|RETRIEVAL_MODE=hybrid` to the `--set-env-vars` value in
`.github/workflows/backend-deploy.yml` (deploy job). This edits a workflow file: a push to `main`
touching it triggers a deploy.

### Then

1. Run the full backend suite in all three modes, `tools/build_index.py --check`, and
   `check_hygiene.sh`.
2. PR → CI `verify` → merge → deploy. Each step needs Yanir's yes.
3. Run the live spot checks (section 4) on the deployed revision.

## 3. Rollback (flag)

Rollback never needs a rebuild of the index, and never sends the whole corpus.

| Situation | Rollback |
|---|---|
| Dense leg misbehaving, BM25 fine | `RETRIEVAL_MODE=lexical`: R1 behaviour, no embed calls. |
| Anything retrieval-related | `RETRIEVAL_MODE=selection`: today's `selection.select`, exactly as it was before R1. |
| Fastest, no code change | Set the env var on the running service: `gcloud run services update backend --region me-west1 --update-env-vars RETRIEVAL_MODE=selection`. This is a GCP change and needs Yanir's approval at the time. It is lost on the next workflow deploy, so follow it with A or B. |
| Durable | Revert the `DEFAULT_MODE` line (A), or remove or change `RETRIEVAL_MODE` in `--set-env-vars` (B), then deploy. |

Automatic degradation already in place (no action needed):

- If the index is stale or invalid: BM25 only, logged once.
- If an embed call times out or errors: BM25 for that request.
- If nothing passes the gate: core only.

## 4. Live spot-check list (after deploy, few calls, Yanir's OK on quota)

Answers are read by a person. Model compliance stays "(unverified)" in the README. For each
question, record the trace's `context_outcome` and document count, and the `Retrieval:` log
line's `mode`, `dense.status`, `dense.cache` and `docs_sent`. The log line never contains the
question.

| # | Question | Expect |
|---|---|---|
| 1 | "What have you written about evals?" | `narrowed` to the two "nothing" posts (the R1 paraphrase miss). Grounded answer. |
| 2 | "תספר לי על ReelSensei" | `narrowed` to ReelSensei; the answer is in Hebrew. |
| 3 | "על מה כתבת לאחרונה?" (Hebrew only, no Latin) | `narrowed` to writing via the dense leg, not `core_only`. |
| 4 | "What frontend stacks have you used across jobs and projects?" | Both project write-ups plus the core (the R1 `multi_doc` miss). |
| 5 | "Where did you work?" | Core only (`core_only` or `conversational`); no stray post. |
| 6 | "Give me a recipe for shakshuka" | `core_only`; an honest decline with the email offer. |
| 7 | "What is quantum annealing?" | `core_only`; an honest decline. |
| 8 | "hi" | `conversational`; no embed call (`dense` absent from the log). |
| 9 | Repeat #1 | `dense.cache = hit`; no second embed call. |
| 10 | An email-only message | The email-collection path; no `Retrieval:` line. |
| 11 | Any question, then "tell me more" | `framed_from_history = true`; same documents. |

Also check:

- Cloud Run logs show no `Vector index not served` line at start-up.
- The cache-miss `embed_ms` is well under 800.
- Memory stays inside 512 Mi with the index loaded (~0.5 MB JSON).
- No 5xx.

## 5. README limitation update (DRAFT — do not apply before R3 ships)

Current text (`README.md`, Limitations):

> - **Document selection is word overlap with an English stopword list.** When no term
>   distinguishes a document, every document is sent (`backend/selection.py`).

Proposed replacement:

> - **Retrieval picks sections, not answers, and can miss.** Each question is matched to sections
>   of the project and writing documents by keyword (BM25) and meaning (`gemini-embedding-2`
>   vectors, built offline and committed in `backend/index/chunks.v1.json`), and only those
>   sections plus the two profile notes are sent. When nothing matches, only the profile notes
>   are sent, never the whole corpus, so a fact in a skipped section is answered as "not
>   covered" (`backend/retrieval.py`).
> - **The vector index must be rebuilt when the docs change.** `python3 tools/build_index.py
>   --build --allow-live-embedding` uses embedding quota and a local `GEMINI_API_KEY`; CI fails a
>   stale index. A stale or missing index, or a failed embedding call, falls back to keyword
>   search (`backend/vector_index.py`).
> - **Each new question costs one embedding call** against the same Gemini key and its per-model
>   rate limits; repeats within a process are cached in memory and never written to disk
>   (`backend/embedding.py`).

Keep unchanged: "The answer trace reports what the model was given, not what it used." Also keep
the model-compliance "(unverified)" wording.

## 6. Out of R3 unless Yanir adds it

- The "more detail" offset (plan section 6), behind the R3 gate and optional.
- Retiring `selection.py`. Decide separately; it is the R0 baseline that `measure_r1.py` checks.
- Anything in R4: numpy or sqlite-vec, the Batch API, explicit caching, File Search, a Hebrew
  analyzer.
