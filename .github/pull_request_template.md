## What changed

<!-- One or two sentences, then bullets for the notable parts. -->

## Why

<!-- The rule this enforces or the protection it adds. Not the story of what went wrong. -->

## How to verify

<!-- Commands to run, or what to look at. -->

## Checklist

- [ ] Every commit is signed off (`git commit -s`), see CONTRIBUTING.md
- [ ] Backend: `pytest -q` passes from `backend/`
- [ ] Frontend: `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run build` pass from `frontend/`
- [ ] `bash .github/scripts/check_hygiene.sh` passes from the repository root
- [ ] No personal data, real paths, hostnames or credentials in code, tests or docs
- [ ] Tests use invented data only
- [ ] No duplicated logic; docs link to an existing explanation instead of repeating it
- [ ] Docs updated if behavior or a privacy claim changed, and every new claim names the file or test that proves it
