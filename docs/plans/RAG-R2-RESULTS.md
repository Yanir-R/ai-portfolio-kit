# R2 results: dense leg + RRF (hybrid mode), offline parts only

Status: **implemented locally, R2 gate NOT evaluated.** Yanir approved phase R2 (offline parts)
and R3 preparation on 2026-11-23 (voice, 15:09 Asia/Jerusalem). He accepts R1 as is and treats R2
as the fix for the paraphrase miss. The code is on the local branch `plan/rag-retrieval-20261123`
only. Nothing was pushed, no PR was opened, nothing was installed or deployed, and no GCP or
Cloudflare setting was changed. **No live API call of any kind was made.** No Gemini or Google
key or token was read, looked for or used.

`RETRIEVAL_MODE` is unset in every environment, so production behaviour is unchanged
(`selection.select` still serves every request). `lexical` is exactly R1. `hybrid` is new. With
no committed index, `hybrid` serves the R1 lexical result (it only adds a `dense` block to the log
line).

Machine-readable output: [`RAG-R2-RESULTS.json`](RAG-R2-RESULTS.json), written by
`backend/tests/retrieval_eval/measure_r2.py` in plumbing mode (`"quality_result": false`).

## What was built

| File | What it does |
|---|---|
| `backend/embedding.py` | Query embeddings: `gemini-embedding-2` at 768 dims through the pinned `google-genai==2.14.0` `embed_content`. Uses `RETRIEVAL_QUERY` / `RETRIEVAL_DOCUMENT` task types, and one reused client per process (`shared_embedder()`). There is an in-memory LRU of 512 entries, keyed by normalised text + model + dims, and an 800 ms hard timeout: the SDK `HttpOptions(timeout=800)` plus a wall-clock bound on a 2-worker executor. A timeout or error returns a typed `QueryEmbedding` with no vector, and the error is reported as type + `file:line`, never the message. The module also has `embed_documents()` for the builder, which wraps every chunk in its own `Content`. |
| `backend/vector_index.py` | The section 5.1 schema: header + one record per project/writing chunk. It also covers `corpus_hash` (length-prefixed SHA-256 of sorted repo path + bytes over the files `context._fingerprint` walks, plus chunker version, model and dims), file mapping by content match (`doc_path`, `doc_slug`, `doc_hash`, `published` from writing `## Date` only), incremental reuse by `(chunk_id, content_hash)`, atomic write (temp + rename), and full load-time validation. It returns a typed `IndexLoad` with status `ok`, `missing`, `unreadable`, `invalid` or `stale` plus a stable reason code, and it never raises. `check_committed()` is the CI verdict. |
| `tools/build_index.py` | Thin CLI over `vector_index`. `--check` (offline staleness check) and `--dry-run` (offline plan; today: 22 chunks, ~7,412 tokens to embed) make no network call. `--build` **refuses (exit 2)** unless `--allow-live-embedding` is given **and** `GEMINI_API_KEY` is in the shell env. It validates the built payload the way the runtime does before replacing the file, and never prints the key. |
| `backend/retrieval.py` | Adds `MODE_HYBRID`. The R1 lexical leg was extracted into `_lexical_leg` unchanged (R1 rows re-verified identical, see Tests). New pieces: `_dense_leg` (index aligned to the BM25 chunk order by `chunk_id`, cosine as a dot product of unit vectors, pure Python), `_fuse` (RRF over the lexical candidates and the chunks with cosine ≥ `MIN_COSINE`; ties broken by corpus order, then `chunk_index`), and the `DenseReport` / `DenseResources` structured objects. The R1 budget, grouping, whole-short-doc rule and core-only miss path are reused, not copied. |
| `backend/tests/fake_embeddings.py` | Deterministic fake client (signed feature hashing of `lexical.index_terms`) and wiring helpers. Test and plumbing use only; it is excluded from the image (`tests/` is in `.gcloudignore`). |
| `backend/tests/conftest.py` | New autouse fixture: building a live embedding client in any test is a hard `pytest.fail`, which the retriever's degrade-on-error handling cannot swallow. |
| `backend/tests/test_embedding.py` (22), `test_vector_index.py` (45), `test_hybrid.py` (28) | Section 9.2 index verification, 9.3 perf, and 9.4 dense-leg unit tests, all with fake clients. |
| `backend/tests/retrieval_eval/measure_r2.py` | R2 gate harness. It reuses `measure_current.evaluate` and `measure_r1._subset`, and checks the lexical rows against `RAG-R1-RESULTS.json` first. `--plumbing` (the default) uses fake embeddings. `--real` refuses without `--allow-live-embedding` and a key. `--tune` sweeps `RRF_K` 2–10 × `MIN_COSINE` 0.50–0.80 on the tune half only, from cached query vectors. |

What the hybrid path does per request:

1. The R1 lexical leg runs unchanged.
2. When the question has topical words and the index is usable, the question (or, for a follow-up with no topical words, the framed history) is embedded once (an LRU hit after that).
3. A chunk qualifies through the lexical leg's gate or through cosine ≥ `MIN_COSINE`.
4. Qualified chunks are ordered by RRF (`Σ 1/(RRF_K + rank)`).
5. Then the R1 budget (3,000 tokens / 12 chunks), whole-document rule, grouping under the original `doc_label` and `[…]` gaps apply.
6. Nothing qualified: core only.

Greetings never call the embedder. One `Retrieval: {json}` line per request gains a `dense` block (`status`, `index_status`, `index_reason`, `cache`, `embed_ms`, `model`, `qualified`, optional `error`), and `cosine` / `rrf` per sent chunk. It carries no visitor text. A missing or stale index logs one extra line once per corpus, not per request.

## Tests

Run with `/workspace/a7-test-venv` (pinned dev requirements; nothing installed), from `backend/`.

| `RETRIEVAL_MODE` | Result |
|---|---|
| unset | **286 passed** |
| `lexical` | **286 passed** |
| `hybrid` | **286 passed** |

That is the 191 R1 tests, unchanged and none ported, plus 95 new: 22 embedding, 45 index verification and builder, and 28 hybrid. The repo hygiene check (`.github/scripts/check_hygiene.sh`) passes.

**R1 is byte-for-byte unchanged in behaviour.** `measure_r1.py` was re-run after the refactor, and every non-latency field of `RAG-R1-RESULTS.json` was identical (0 differences). The committed file was restored, not rewritten. `measure_r2.py` re-checks this on every run.

What the new tests cover (plan section 9):

- **9.2 index verification:**
  - the exact 5.1 field set and no `tags` / `updated`;
  - write → load → validate, byte-identical rebuilds and a one-line-per-chunk file;
  - 9 schema violations and 5 bad-vector cases, each with a stable reason;
  - missing, unreadable and non-object files degrade without raising;
  - the hash matches the live docs, covers chunker, model and dims, and walks exactly the `_fingerprint` file set;
  - a copied docs tree hashes the same, and one changed byte goes stale;
  - a mutated header hash, a model or dim different from the pin, an edited body, an unknown label and a missing chunk are all stale;
  - each span hashes to `content_hash` and lies inside its file, and chunks tile each document;
  - index ids equal runtime ids;
  - profile is never indexed, and `published` is writing only;
  - incremental reuse: 0 re-embeds when nothing changed, 1 when one chunk changed, all when the model changed;
  - an atomic-write failure leaves the old file;
  - the committed index is fresh or absent (the CI staleness check);
  - builder refusals and offline modes;
  - golden held-out rankings for the lexical leg (pinned at R1's 13/18 recall@12 and 14/18 MRR) and deterministic BM25 order.
- **9.3 perf:** 768-dim fake vectors over the committed corpus, warm LRU. The test asserts end-to-end p95 ≤ 15 ms, dense step (LRU hit + cosine) p95 ≤ 5 ms and LRU hit p95 ≤ 1 ms. Measured on the box: end to end median 0.56 / p95 0.72 ms, dense step median 0.46 / p95 0.61 ms, LRU hit p95 0.011 ms.
- **9.4 dense leg:**
  - LRU hit/miss, single client, key normalisation, bounded eviction, model+dims in the key, unit vectors, task type and dimension sent;
  - timeout (wall clock and SDK-style), API error (no message logged), wrong dimension, no client, failing factory and empty query;
  - documents each in their own `Content`, with batching;
  - RRF arithmetic and ties; lexical candidates always survive fusion, and hybrid equals lexical exactly when nothing clears `MIN_COSINE`;
  - a staged paraphrase rescued by the dense leg;
  - timeout, error, missing, stale, invalid and unreadable index, loader exception and model mismatch all give the R1 lexical result, then core only;
  - greeting makes no call, a follow-up embeds the framed history, a repeat is one call;
  - one JSON line with no visitor words, and lexical log lines unchanged;
  - the flag: unset is still `selection.select`, and hybrid with no committed index equals lexical on all 55 eval questions;
  - the email-only shortcut never calls retrieval;
  - the committed corpus runs end to end on a fake index.

## Eval: plumbing check only — NOT a quality result

`measure_r2.py` (default `--plumbing`) ran the hybrid path over the committed corpus and all 55
eval questions with **fake** 64-dimension hashed-term vectors in an in-memory index.

- The dense leg ran `ok` on 55 / 55 questions; the index loaded and validated once.
- Held-out numbers for hybrid-with-fake-vectors are **identical** to R1 lexical: recall 0.856, precision 0.936, desired outcome 0.867, median PROFILE 1,919 tokens. That is expected. Hashed-term vectors know only shared words, so at `MIN_COSINE = 0.60` they add nothing BM25 had not already found.
- In-process `select` latency with the fake leg (LRU hits): median-of-medians 0.143 ms, p95-of-medians 0.188 ms, against 0.081 / 0.108 ms for lexical.

**None of this says anything about whether dense retrieval fixes `paraphrase` or `hebrew`.** That
needs real vectors and live query embeddings: the R2 gate, pending below. The JSON stores the
gate-shaped table under `gate_shape_only_not_a_result`.

No fake-vector index was written to `backend/index/`. Fake indexes exist only in memory or under
pytest's `tmp_path`, and the production loader rejects any model other than `gemini-embedding-2`
at 768 dims.

## Deviations from the plan

1. **`chunk_id` keeps R1's label-based derivation** (`doc_label` + heading path + index), not
   `doc_path`. The index has to align to the runtime BM25 chunks by id, and the runtime has
   labels only. Both are deterministic, and `doc_path` is still stored on every record.
2. **The CI staleness check is a pytest test**
   (`test_the_committed_index_is_fresh_or_absent`), which runs in the existing backend-deploy
   `verify` → `Tests` step on every PR touching `backend/**`. It is also available as
   `tools/build_index.py --check`. It is not a new step in `hygiene.yml`: that job installs no
   Python packages, and the corpus reader imports `pypdf`. No workflow file was edited. The
   limitation is that a change to `tools/` alone does not trigger that workflow, but the check
   logic lives in `backend/vector_index.py`, and docs and index both live under `backend/`.
3. **A missing index passes the check.** That is the documented R2 state until the real index
   exists. Once an index is committed, a stale or invalid one fails CI.
4. **The index is loaded lazily** on the first hybrid request for a corpus, not at process start,
   so unset and lexical modes never read it. It is validated once per corpus and cached, and a
   bad index logs once.
5. **LRU key normalisation is NFKC, niqqud stripped, lower-case and whitespace collapsed.** The
   key is also the embedded text, so a vector never depends on which phrasing arrived first.
   Final-letter folding from `lexical.normalise` is not applied, because it would send misspelled
   Hebrew to the model.
6. **Qualification is the R1 lexical gate OR cosine ≥ `MIN_COSINE`.** The R1 document-level
   coverage gate (R1 deviation 2) is kept as the lexical leg; the plan's "BM25 top-M" wording is
   not applied.
7. **`RRF_K = 5` and `MIN_COSINE = 0.60` are provisional and uncalibrated.** The plan fits them on
   the tune half with real embeddings; `measure_r2.py --real --tune` does that sweep and prints
   the results without editing code.
8. **Embedded document text is the BM25 text:** `{doc_label} › {headings}` plus the chunk, with
   `task_type=RETRIEVAL_DOCUMENT`. No `title:` / `task:` prefix style is used, and the config's
   `title` field is not set. The plan says official task types win, but whether
   `gemini-embedding-2` honours `task_type` through SDK 2.14.0 has not been tried against the
   live API (unverified).
9. **The timeout is enforced twice:** by the SDK HTTP timeout (800 ms) and by a wall-clock
   `future.result(timeout=0.8)` on a 2-worker executor. An abandoned call can finish in the
   background; its result is discarded and not cached.
10. **Dense golden rankings are not a pytest.** They need live query embeddings, so they are
    scored by `measure_r2.py --real`. The pytest golden test pins the lexical leg.
11. **New modules `embedding.py` and `vector_index.py`** rather than everything in
    `retrieval.py`. This keeps the request path, the persisted schema and the API client
    separately testable. `retrieval.py` holds only fusion and the flag.
12. **A follow-up with no topical words embeds the framed history** (the last 6 turns, the same
    text BM25 is framed with), not the bare message.

## Pending: needs Yanir

In this order. None of it has been started.

1. **OK on embedding quota, and a key in the builder's own shell.** Building the index embeds 22
   chunks (~7.4k tokens) in one call. The free tier is free of charge [plan P1]; at paid list
   price it is ≈ $0.0015. Then:
   ```
   python3 tools/build_index.py --dry-run
   GEMINI_API_KEY=… python3 tools/build_index.py --build --allow-live-embedding
   python3 tools/build_index.py --check
   cd backend && pytest -q          # CI staleness test now enforces the committed file
   ```
   Commit `backend/index/chunks.v1.json`. Review the diff: one line per chunk, and the header
   shows the model and dims.
2. **The R2 gate on real embeddings.** This makes 55 live query-embedding calls, one per eval
   question; repeats are LRU hits.
   ```
   GEMINI_API_KEY=… python3 backend/tests/retrieval_eval/measure_r2.py --real --allow-live-embedding --tune
   ```
   Fit `RRF_K` and `MIN_COSINE` from the tune-half sweep only. Then re-run without `--tune` for
   the held-out gate. The gate is: hybrid recall ≥ lexical on every category, strictly better on
   `paraphrase` and `hebrew`, and no regression on `profile`. The same run gives the cache-miss
   p95 against the 800 ms budget (plan section 6.2).
3. **The four open R1 decisions** (`RAG-R1-RESULTS.md`, Open questions). Decision 1 is answered
   (keep R1, R2 is the fix). Still open:
   - `MIN_SHARE_OF_BEST` 0.5 or 0, where 0 needs fresh held-out questions;
   - keeping the English stemmer frozen until R3;
   - adding `now` and similar words to the stopword list, which also moves R0.

   Nothing here changed any of them.
4. **The 3,500-token budget question** raised after R1 is still unapplied. `RETRIEVAL_TOKEN_BUDGET`
   stays 3,000.
5. Push, PR, merge and deploy: none without Yanir's yes.

## What was not done

- No live embedding or generation call, no key read, and no real index.
- No push, PR, merge or deploy, and no GitHub settings change.
- No gate threshold, half-of-best cut, stemmer, stopword list, eval label or split changed.
- No dependency installed or updated (Python or npm).
- No frontend change: hybrid reuses the existing outcome strings.
- No README limitation change. That is R3; the draft is in `RAG-R3-PREP.md`.

## How to reproduce

```
(cd backend && pytest -q)                                 # also RETRIEVAL_MODE=lexical / hybrid
python3 tools/build_index.py --check                      # offline staleness check
python3 tools/build_index.py --dry-run                    # offline build plan
python3 backend/tests/retrieval_eval/measure_r2.py --record-tests "unset=286,lexical=286,hybrid=286"
```
