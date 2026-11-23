# Contributing

Thanks for helping. The design is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and ideas for
next steps are in [docs/ROADMAP.md](docs/ROADMAP.md).

## Ground rules

- **Privacy first. Never commit real conversations, memories, paths, hostnames or credentials.**
  Tests use invented data only. `.github/scripts/check_hygiene.sh` runs in CI and catches the
  obvious shapes, but it is not a substitute for reading your own diff.
- **No duplicated logic.** Reuse an existing helper, or link to the document that already
  explains something instead of repeating it.
- **Small pull requests. One change, with tests and a doc update.**
- **Ship only what you can prove.** A claim in the docs names the file or test that shows it;
  anything else is marked "(unverified)".
- **Fix forward in public, explain backward in private.** A pull request states the rule and
  the protection it adds, never the story of what went wrong.

## Local checks

Run these before opening a pull request.

Backend, from `backend/`:

```sh
pytest -q
```

Frontend, from `frontend/`:

```sh
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Hygiene, from the repository root:

```sh
bash .github/scripts/check_hygiene.sh
```

The hygiene script scans tracked files for private paths, private network addresses, internal
hostnames, internal identifiers and credential shapes. If a hit is a deliberate, invented
example, add an entry with a reason comment to `.github/hygiene-allowlist.txt`.

## Workflow

1. Open an issue for anything beyond a small fix, so the approach can be agreed.
2. Fork, branch from `main`, and make the change.
3. Sign off every commit (see below).
4. Fill in the pull request template.
5. A maintainer reviews. Every file is read for personal data and duplication before it merges,
   and the result is recorded in [docs/REVIEW-LOG.md](docs/REVIEW-LOG.md).

## Sign your commits (DCO)

This project uses the [Developer Certificate of Origin](DCO) instead of a CLA. By signing off you
certify that you wrote the contribution or have the right to submit it under the MIT license.

```sh
git commit -s -m "Describe the change"
```

This adds a `Signed-off-by: Your Name <you@example.com>` line, which must match your git
`user.name` and `user.email`. To fix existing commits: `git rebase --signoff main`.

You keep your own copyright; the project does not ask for copyright assignment.

## License and name

Code is licensed under the MIT license, as in [LICENSE](LICENSE). The project name and the
owner's personal content are covered by [TRADEMARK.md](TRADEMARK.md).

## Conduct

Be respectful and assume good faith. Harassment and personal attacks are not tolerated;
maintainers may remove content and block contributors who engage in them.
