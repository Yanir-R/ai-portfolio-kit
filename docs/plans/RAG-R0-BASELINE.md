# R0 baseline: current document selector

Status: **measurement only**. This records how `context.get_knowledge` and
`selection.select` on the current corpus behave against the R0 eval set. No new
retrieval code was added, no dependency was installed, no live Gemini call was
made, and nothing was pushed.

Measured 2026-11-23, 12:51 Asia/Jerusalem, in the
`plan/rag-retrieval-20261123` worktree, corpus identical to `origin/main` at
`e9215c1` (10 documents, about 8,770 tokens). Machine-readable results:
[`RAG-R0-BASELINE.json`](RAG-R0-BASELINE.json). Eval set:
`backend/tests/retrieval_eval/questions.v1.json` (55 questions, authored by
Trinity Grok). Harness: `backend/tests/retrieval_eval/measure_current.py`.

**Generation / model latency is not measured.** There were no live Gemini
calls. Token figures use the repo constant `CHARS_PER_TOKEN = 4`
(`len(text) // 4`), not provider usage. Selection latency is
`time.perf_counter` around `selection.select` only (3 warm-up calls, then 51
timed repeats per question; median and p95 of those repeats).

## Metrics

- **Recall:** fraction of `expected_doc_labels` that appear in the selected
  PROFILE. Macro-averaged per category and overall.
- **Precision:** fraction of selected labels that are either expected or the
  always-allowed core (`Profile / about-me`, `Profile / resume`). Extra core
  documents are not counted as unneeded when the gold list omitted them.
- **Unneeded:** selected documents that are neither expected nor core.
- **Desired outcome rate:** whether today's typed outcome matches the *desired*
  hybrid outcome in the eval set (`narrowed` / `core_only` / `conversational`).
  Today's selector has no `core_only` value: a `narrowed` result that contains
  only the two profile documents counts as a match for `core_only`, and so does
  `conversational`. `unfocused` (send all ten) never does.

## Overall

| | Value |
|---|---|
| Questions | 55 (45 English, 10 Hebrew) |
| Macro recall | 0.873 |
| Full-recall rate (recall = 1) | 0.855 (47 / 55) |
| Macro precision | 0.754 |
| Mean unneeded non-core docs | 1.53 |
| Desired-outcome rate | 0.655 (36 / 55) |
| Actual outcomes | 41 narrowed, 8 conversational, 6 unfocused |

The six unfocused questions send the entire 8,770-token corpus. Two of those
six are an artefact of the tokenizer treating a trailing period as part of the
term (`ReelSensei.` and `Hermes.` do not match `reelsensei` / `hermes` in the
index). The other four are true no-signal or weak-signal cases, including the
motivating paraphrase "What have you written about evals?".

## By category

| Category | n | Macro recall | Full recall | Macro precision | Mean unneeded | Desired-outcome rate | Actual outcomes |
|---|---:|---:|---:|---:|---:|---:|---|
| direct_keyword | 6 | 1.000 | 1.000 | 0.758 | 1.67 | 0.833 | 5 narrowed, 1 unfocused |
| paraphrase | 7 | 0.786 | 0.714 | 0.736 | 1.57 | 0.857 | 6 narrowed, 1 unfocused |
| no_word_match | 5 | 1.000 | 1.000 | 0.507 | 2.80 | 0.000 | 4 narrowed, 1 unfocused |
| off_topic | 5 | 1.000 | 1.000 | 0.600 | 2.80 | 0.400 | 4 narrowed, 1 unfocused |
| profile | 6 | 1.000 | 1.000 | 0.711 | 2.00 | 0.500 | 5 narrowed, 1 unfocused |
| project | 5 | 1.000 | 1.000 | 0.820 | 0.80 | 1.000 | 5 narrowed |
| writing | 6 | 1.000 | 1.000 | 0.738 | 1.50 | 1.000 | 6 narrowed |
| multi_doc | 5 | 0.900 | 0.800 | 0.740 | 1.80 | 0.800 | 4 narrowed, 1 unfocused |
| hebrew | 10 | 0.500 | 0.500 | 0.975 | 0.10 | 0.500 | 8 conversational, 2 narrowed |

Keyword, project and writing questions almost always include the right
document. The gaps this plan exists to close are paraphrases that share no
distinctive words, the send-all miss path (desired: core only), and Hebrew.

`no_word_match` and `off_topic` have perfect recall only because the core (and,
on unfocused rows, every document) is always present, so the gold core labels
are found. Precision is the number that matters there, and it is poor: four of
five "no word match" questions still *narrowed* to an unrelated project or
post (the selector always keeps the current best match, even when that match is
a weak leftover English word), and one sent everything. Desired-outcome rate
on `no_word_match` is 0.

Two off-topic questions ("weather in Tel Aviv", "World Cup in 2022") already
narrow to core only, which is the desired set. The lasagna recipe sends
everything. Homework / React questions drag in projects and posts because
"Python" and "React" occur in the corpus.

## Worst misses (recall < 1)

Eight questions miss at least one expected document. Five are Hebrew-only
questions about projects or posts (see the next section). The English misses
are:

1. **`q-en-paraphrase-04`** ("How expensive can a single coding-assistant sitting get?")
   — recall 0. Narrowed to the "three meanings of nothing" article and the
   JavaScript async article. Missed `Writing / 22.7 million tokens. One session. $340 burned.`
   The distinctive figures were deliberately left out of the question.
2. **`q-en-paraphrase-06`** ("Why shouldn't a missing record and a failed call be reported the same way?")
   — recall 0.5. Found the long "Three Meanings of Nothing" article, missed the
   short LinkedIn version `Writing / "Nothing found."`, and also sent ReelSensei.
3. **`q-en-multi-05`** (production token cost + an expensive coding-assistant session)
   — recall 0.5. Found about-me, missed the Cursor token-burn post, and sent
   ReelSensei plus the async article.

Related near-misses that still have recall 1 (the expected docs were included,
but the outcome or precision is wrong):

- **`q-en-paraphrase-01`** "What have you written about evals?" — `unfocused`,
  all ten documents. The word `evals` never appears (stem `eval` does not
  either). This is the motivating case for the dense leg.
- **`q-en-direct-01`** "Tell me about ReelSensei." and **`q-en-profile-03`**
  "Tell me about Hermes." — `unfocused` because `_TERM_RE` keeps the trailing
  period (`selection.py:111` includes `.` in the token). The query term is
  `reelsensei.` / `hermes.`; the index has `reelsensei` / `hermes`. The same
  questions without the period narrow correctly to the one relevant document
  plus core. **`q-en-multi-01`** "Compare your two projects." fails the same
  way (`projects.`).
- Several profile and keyword questions include the right documents and also
  one to three unrelated posts, which is why precision sits well below 1 even
  when recall is 1.

## Hebrew behaviour

The corpus contains **zero** Hebrew characters. The current tokenizer
(`selection._TERM_RE = [a-z0-9][a-z0-9+.#-]*`) extracts no terms from a
Hebrew-only question. With no history, `select` takes the CONVERSATIONAL path
and sends only the two profile documents.

| Slice | n | What happened |
|---|---:|---|
| Hebrew-only, desired `core_only` (current work, languages, Israeli companies) | 3 | Conversational, core only. Recall 1, by accident: the desired set happens to be the greeting fallback. |
| Hebrew-only, desired `narrowed` (היילייטים, כשכתבת / טוקנים, כשלי כלים, הפרויקטים, רילסנסיי) | 5 | Conversational, core only. Recall 0. A visitor asking in Hebrew about ReelSensei or a post will not get that document. |
| Mixed Hebrew+Latin (`ReelSensei`, `Claude`) | 2 | Narrowed. Both found the target document. The Claude question also sent the advisor post (one unneeded doc). |

So today's Hebrew behaviour is "core only, unless the question also contains a
Latin name". That is the opposite of a multilingual lexical retriever, and it
is why the plan adds Hebrew normalization and relies on `gemini-embedding-2`
("across over 100 languages") for cross-lingual cases. It also means the
desired core-only path is already what Hebrew-only off-topic or profile
questions get — without ever scoring the question.

Macro recall on the Hebrew slice is 0.500; precision is 0.975 only because
misses send the core and nothing else.

## Token statistics

Estimates are `len(text) // 4`. The PROFILE column is `Knowledge.text` (the
fenced corpus body). The system-prompt column is `prompt.build_system_instruction`
(the rules plus the PROFILE fence). Sending everything is about 8,770 PROFILE
tokens and 9,789 system-prompt tokens.

| Slice | n | PROFILE tokens (median / mean / min / max) | System prompt tokens (median / mean / min / max) |
|---|---:|---|---|
| Overall | 55 | 4,103 / 4,007 / 1,658 / 8,770 | 5,121 / 5,025 / 2,677 / 9,789 |
| English | 45 | 4,368 / 4,451 / 1,658 / 8,770 | 5,386 / 5,470 / 2,677 / 9,789 |
| Hebrew | 10 | 1,658 / 2,006 / 1,658 / 4,103 | 2,677 / 3,024 / 2,677 / 5,121 |
| Core only (1,658 PROFILE / 2,677 prompt) | 13 questions | conversational or narrowed-to-core | |
| Send-all (8,770 / 9,789) | 6 questions | all `unfocused` | |

Most English narrowed questions sit around 3.4k–4.5k PROFILE tokens — less
than send-all, but well above a tight 3k retrieved budget plus core, because
today's unit is still the whole document.

## Latency

`selection.select` is already in the noise, as the plan expected for an
in-process overlap over ten documents.

| | Time |
|---|---|
| Corpus load (`get_knowledge`, first call, includes markdown reads) | 0.95 ms on this run |
| `select()` median-of-medians (55 questions, 51 repeats each) | 0.008 ms |
| p95-of-medians | 0.012 ms |
| Max p95 on any single question | 0.019 ms |
| Hebrew-only questions (no terms, conversational return) | median-of-medians 0.003 ms |

These numbers are a baseline for the later BM25 / cosine budgets in the plan
(section 6.2: in-process p95 ≤ 5 ms each). They are **not** end-to-end chat
latency. The dominant production cost is the generation call, which this
harness does not touch.

## Notable findings

1. **Fail-open is real, and sometimes accidental.** Six of 55 questions send
   all ten documents. Two of them ("ReelSensei.", "Hermes.") would have
   narrowed correctly without the trailing period. A later tokenizer should
   split punctuation; that is independent of embeddings.
2. **Paraphrases without distinctive words are the English recall gap.** "evals"
   sends everything; the coding-assistant cost paraphrase missed the token-burn
   post entirely; the empty-tool paraphrase missed the short LinkedIn version.
3. **The miss path almost never declines to core only.** On `no_word_match`,
   desired-outcome rate is 0: the selector either sends everything or keeps a
   weakly related best match. Yanir's core-only decision is a behaviour change,
   not a documentation of what already happens (except for Hebrew-only and a
   couple of off-topic questions).
4. **Hebrew-only questions never reach projects or writing.** Mixed questions
   that include a Latin proper name do. That is the R0 evidence for the Hebrew
   normaliser and the multilingual dense leg.
5. **Whole-document selection is already cheap and already imprecise.** Latency
   is not the problem. Extra documents on an otherwise correct answer are.

## How to reproduce

From the repo root, with no extra installs (pypdf is stubbed in memory; the
current corpus is all markdown):

```
python3 backend/tests/retrieval_eval/measure_current.py
```

The script rewrites `docs/plans/RAG-R0-BASELINE.json`. It does not call the
network.
