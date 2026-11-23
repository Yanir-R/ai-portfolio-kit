# Security policy

AI Portfolio Kit runs a public, unauthenticated API that spends model quota and sends mail, so
security reports are taken seriously.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private vulnerability reporting:
**Security tab -> Report a vulnerability**.

Include what you found, how to reproduce it, and what it lets a caller do or see. You can expect
an acknowledgement within a few days. This project is maintained by one person, so fixes are
best-effort, but anything that exposes non-public data or lets a caller spend the owner's quota
is prioritised.

## Scope

In scope:

- Bypassing the edge shared secret: reaching a guarded backend endpoint without it while
  enforcement is on, or making the edge Worker forward a caller-controlled value.
- Bypassing or resetting the rate limits on the chat or contact endpoints.
- Abuse of the contact endpoint or the in-chat email path: sending mail to a recipient other
  than the configured inbox, injecting mail headers, or skipping validation.
- Prompt injection that makes the chat reveal non-public data (configuration, secrets,
  server details) or act outside the published corpus.
- Path traversal in `/api/content/`, or any way to read a file outside the profile folder.
- Error responses that reflect internal paths, configuration or credentials.

Not a vulnerability: reading anything under `backend/docs/`. That content is published by
design, as [docs/PRIVACY.md](docs/PRIVACY.md) states.

## Supported versions

Only `main`.
