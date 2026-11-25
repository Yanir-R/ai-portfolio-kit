# AI Chat Portfolio

## Overview
This site, yanirrot.com, and the project I am building right now. A visitor asks a question and an agent answers in my name, only from documents I wrote: my projects, my posts, my resume and how I work. It is not trained on anything. Code picks the documents a question needs, the model is given only those, and when they do not cover the question the agent says so and hands the question to me instead of guessing. Under every answer there is a "behind the answer" link that shows which documents the answer was given and what was measured while it was written. The site is Hebrew first, with a full English twin, and every route to me (a call, email or WhatsApp) is one click from the chat. The code is open source.

## Technical Details
- **Frontend**: React 19, TypeScript, Vite, served from Cloudflare Pages; every route is prerendered for search engines, with a sitemap and llms.txt
- **Edge**: a Cloudflare Worker in front of the API, with Turnstile and a shared secret, so the backend is never called directly
- **Backend**: FastAPI on Google Cloud Run, the Gemini API with fallback models, contact mail over SMTP, secrets in Secret Manager
- **Content**: a folder of markdown documents in Hebrew and English; no database
- **Search**: routing phrases per document, checked by a test bank of real questions in both languages
- **CI/CD**: GitHub Actions, with an AI code review on every pull request
- **License**: MIT

## Key Features
- Answers only from my documents. If nothing matches, the agent says so and offers to pass the question to me
- "Behind the answer": the documents the answer was given and the tokens and time it took, from the answer's own trace
- Text inside the documents and the visitor's message is treated as content, never as instructions (prompt-injection hardening)
- Limits that protect the budget: 20 answers per visitor a day, 300 a day for the whole site, and a monthly spend cap; every limit message leads to contacting me
- From the third question, a handoff card offers to continue with me personally
- Booking a call (cal.com) and sending email happen inside the site; a visitor can also leave an email address in the chat
- Diagrams next to an answer, chosen in code from the question and the documents, never by the model

## Who decides what
- **The visitor** asks, books a call or sends an email. A visitor cannot change the agent's instructions or what it knows.
- **The model** only writes the answer, from the documents it was given.
- **Code** chooses which documents (up to three besides my profile) the model sees, chooses any diagram next to an answer, decides when the card to continue with me appears, and enforces the limits.
- **I** change the agent's instructions only in code, by pull request, and add knowledge only as a document with a test question; a new document without one fails the tests.

## Project Type
web-app

## Status
production

## Demo URL
https://yanirrot.com

## Repository
https://github.com/Yanir-R/ai-portfolio-kit

## Media
/projects/ai-chat-portfolio.png

## Featured
true

## Category
AI Agents & Automation
