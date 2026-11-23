# Privacy

The project rule comes first:

> **Privacy first. Never commit real conversations, memories, paths, hostnames or credentials.**

This page states what the code does with a visitor's data. Each claim names the file that shows
it. Anything that could not be confirmed in the code is marked "(unverified)".

## What a chat message touches

| Step | What it receives | Shown by |
|---|---|---|
| Edge Worker | The whole request: message, the conversation history the browser sends, and headers. It forwards the request and stores nothing itself. | `edge/src/index.js` |
| Backend | The same request. It validates size, applies rate limits and builds the model request. | `backend/main.py` |
| Gemini API | The question, a bounded number of recent turns, and the selected documents from `backend/docs/`. This is a third-party service, used under its provider's terms. | `backend/main.py`, `backend/tests/test_context_layer.py` |

The frontend is a static bundle on Cloudflare Pages. Chat messages go to the API, not to Pages.

## What is stored

- **No database.** The backend code that was reviewed writes no conversation to disk or to a
  store (`backend/main.py`, `backend/context.py`, `backend/selection.py`,
  `backend/rate_limit.py`).
- **Conversation history lives in the visitor's browser** and is sent again with each request
  (`ChatRequest` in `backend/main.py`). Whether the frontend keeps it beyond the open page is
  (unverified).
- **Rate-limit counters are held in memory** in the backend process, keyed on the client
  address, and age out with their window (`backend/rate_limit.py`).

## What is logged

By the backend, to its standard log output:

- For a chat request: the message length and the number of history messages. Not the text
  (`backend/main.py`).
- For document selection: the labels of the documents chosen. Not the question
  (`backend/selection.py`).
- For a rate-limit hit: the endpoint label, the client address and the retry delay
  (`backend/rate_limit.py`).
- For a request rejected by the edge secret check: the path (`backend/main.py`).
- For a contact delivery: that a send was attempted and whether it succeeded. The visitor's
  address and message are not written to the log by this code (`backend/main.py`).
- On errors: a stack trace. Whether a trace can include request content is (unverified).

Not confirmed here:

- What the model client module (`backend/gemini_helper.py`) logs (unverified).
- What Cloud Run and Cloudflare record about each request on their side, and for how long
  (unverified). `edge/wrangler.jsonc` turns Worker observability on.
- What the Gemini API provider retains (unverified); see that provider's terms.

## The contact path

There are two ways a visitor's address reaches the owner, and both end in one email:

1. **In the chat.** A message that is an email address, or that contains one while the chat is
   asking for it, is validated and emailed. The model is not called for that message.
2. **The contact endpoint.** `POST /api/contact` validates the address and the message length,
   applies the rate limit, and sends the email. Whether the frontend uses this endpoint is
   (unverified).

The email contains the visitor's address, their message and a timestamp. It is sent over SMTP
from the configured sender account to the configured inbox (`_send_contact_email` in
`backend/main.py`). The address is not stored anywhere else by the backend; the inbox is the
record.

## Everything under `backend/docs/` is public

- It is tracked in a public repository, so it is readable by anyone.
- It is sent to the model: the selected documents travel to the Gemini API with a chat question.
- The profile folder is also served to any caller by `GET /api/content/{file_name}`.

Treat every file there as published. It is for what belongs on a public portfolio and nothing
else. `backend/tests/test_context_layer.py` asserts that the published
documents carry no direct contact details beyond what the site itself offers.
