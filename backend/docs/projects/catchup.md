# catchup

## Overview
A mod for Claude Code that summarizes the agent messages you have not read, in plain English. You come back to a long thread, or an agent worked while you were away, and instead of scrolling you ask for a summary: what the agent needs from you, what it did with proof, and a handoff for the next session. The rule behind it is one I use everywhere: the model writes language, code does the rest.

## Technical Details
- **Language**: TypeScript
- **Platform**: Claude Code plugin, installed from the plugin marketplace
- **Model**: Runs in your own Claude session
- **License**: MIT

## Key Features
- The model must return structured JSON. Code validates it, retries once if it is invalid, and falls back to the raw text with a warning
- Every item cites the message it came from
- A "done" item with no proof is shown as not checked, and a name that does not appear in the messages is marked as uncertain
- Long threads are summarized in parts and then merged
- Secrets and email addresses are redacted before anything reaches the model, and nothing is stored: state lives in memory only
- The release check fails if any storage, network or process call appears in the code

## Project Type
web-app

## Status
production

## Repository
https://github.com/Yanir-R/catchup

## Media
/projects/catchup-preview.png

## Featured
true

## Category
Developer Tools & Open Source
