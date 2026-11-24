# PersonaKit

## Overview
Memory for AI assistants that you can read, correct and take with you. PersonaKit reads the conversations you already have with your coding assistants, proposes short memories, and keeps the exact quote each one came from - every memory has a receipt. It serves back only what you approved, over MCP. There is no PersonaKit server and no account: everything stays on your machine. I created it and I am its lead developer, and it is open source.

## Technical Details
- **Language**: Python 3.10+, no required dependencies
- **Storage**: Local SQLite
- **Interface**: Command line, MCP server
- **Extraction**: Runs through your own signed-in Claude or Codex CLI
- **License**: Apache-2.0
- **CI/CD**: GitHub Actions, tests on Python 3.10 and 3.13, a 90% coverage floor

## Key Features
- Every memory keeps its source quote, so you can check where it came from before you trust it
- Nothing is used until you approve it: a memory is unconfirmed, approved, restricted or archived
- Tidy and decay are reversible: a plan is shown first, nothing changes without an explicit apply, and one step can be undone
- An MCP server with two narrow tools, read and propose, so an assistant can use your memory without owning it
- Only your own turns are sent to the model, and the model runs with its tools off

## Where it is going
PersonaKit is the first tool in a set. Today it holds memory management. Imports from ChatGPT, claude.ai and Gemini are on the roadmap, and I plan to add more systems next to it over time.

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
