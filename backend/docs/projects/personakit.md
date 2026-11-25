# PersonaKit

## Overview
Memory for AI assistants that you can read, correct and take with you. PersonaKit reads the conversations you already have with your coding assistants, proposes short memories, and keeps the exact quote each one came from - every memory has a receipt. It serves memories back to your assistants over MCP: approved ones, and unconfirmed ones labelled as such; restricted and archived memories are never served. There is no PersonaKit server and no account: everything stays on your machine. I created it and I am its lead developer, and it is open source.

## Technical Details
- **Language**: Python 3.10+, no required dependencies
- **Storage**: Local SQLite
- **Interface**: Command line, MCP server
- **Extraction**: Runs through your own signed-in Claude or Codex CLI
- **License**: Apache-2.0
- **CI/CD**: GitHub Actions, tests on Python 3.10 and 3.13, a 90% coverage floor

## Key Features
- Every memory keeps its source quote, so you can check where it came from before you trust it
- You decide what each memory is: unconfirmed (served with a label), approved, restricted or archived (never served)
- Tidy and decay are reversible: a plan is shown first, nothing changes without an explicit apply, and one step can be undone
- An MCP server with two narrow tools, read and propose, so an assistant can use your memory without owning it
- Only your own turns are sent to the model, and the model runs with its tools off

## Where it is going
PersonaKit is the first tool in a set. Today it holds memory management. Imports from ChatGPT, claude.ai and Gemini are on the roadmap, and I plan to add more systems next to it over time.

## Who decides about memory
- **You** can read, propose, see the quote behind any memory, approve, restrict, hide or forget, and tidy duplicates and stale memories (a plan first, and every step can be undone).
- **An assistant** can read memories relevant to its question and propose new ones. It sees a quote only when it asks, and it cannot approve, restrict, hide, forget or tidy.

The four states: **unconfirmed** (the default, served with a label), **approved** (served when relevant; re-extraction never touches your decision), **restricted** (never served) and **archived** (never served). Nothing is deleted for good without an explicit "forget".

## How it is built
Ingest reads Claude Code and Codex session files and keeps only what you wrote. Extraction asks your own model, with its tools off, to propose short memories with a quote; a memory with no quote is not stored. Everything lands in one SQLite file on your machine, where you review it. An MCP server with two narrow tools, read and propose, serves only relevant memories to your assistants (Claude Code, Codex, Trinity Agent and others), and masks email addresses in quotes.

## Project Type
web-app

## Status
in-development

## Demo URL
https://personakit.me

## Repository
https://github.com/Yanir-R/personaKit

## Media
/projects/personakit-demo.gif

## Featured
true

## Category
AI Memory & Open Source
