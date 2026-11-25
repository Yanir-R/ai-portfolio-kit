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

## What the model does, and what code does
- **The model** writes the summary in short sentences and finds questions waiting for you.
- **Code** checks sentence length, adds questions the model missed, decides what failed and what is still running, decides whether "done" was really proven, and checks that every source number and name exists.
- **Neither** stores data or reaches the network; the release check fails if the code touches storage, the network or a process.

## How it is built
The agent messages you have not read (and messages from other sessions) are scrubbed of secrets and email addresses, split into parts if the thread is long, and given to the model, which answers in a fixed JSON shape. Code checks every item and draws the summary pane on the side, always in the same order with the same labels, without adding a turn to the chat.

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
