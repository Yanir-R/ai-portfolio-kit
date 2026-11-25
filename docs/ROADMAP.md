# Roadmap

These are ideas, not commitments. There are no dates. Each one comes from a limitation that is
visible in the code today, and none of them is promised.

| Idea | The limitation it comes from | Where it shows |
|---|---|---|
| Share rate-limit state across processes and instances | Counters are held in the backend process, so the global ceiling multiplies with each one | `backend/rate_limit.py` |
| Deploy the edge Worker from CI | The Worker is deployed by hand | `.github/workflows/`, `edge/README.md` |
| Make the mail server configurable | The SMTP host is fixed in code | `backend/mailer.py` |
| Add frontend tests | The frontend has typecheck, lint, format and build scripts, and no test script | `frontend/package.json` |
| Selection for languages other than English | Selection uses word overlap and an English stopword list | `backend/selection.py` |
| Check grounding behaviour automatically | The question set for prompt and profile changes is run by hand | `backend/README.md` |
| Test the edge Worker | The Worker has no tests | `edge/` |

**Ship only what you can prove.** An idea moves from this table into the README's "What works
today" list only when a file or a test shows it.

Ideas and contributions that keep the project small and readable are welcome through issues.
