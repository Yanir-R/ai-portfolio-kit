# Trinity Agent

## Overview
My own always-on AI assistant. It runs all day on my machine, and I talk to it in a private chat on WhatsApp or Telegram, like messaging a person. It learns how I work, does the groundwork before I ask, and checks with me only where it counts. Its memory has two layers. Its own record, meaning summaries of its work, the improvements it proposes, and its measurements and performance, lives in an Obsidian vault under git and updates itself every day. PersonaKit, my open-source memory tool, manages the shared memory between all my agents and my coding assistants, such as Claude Code, so they all work from the same approved picture. It is built on Hermes Agent, the open-source project by Nous Research, run as a private distribution with a small, named set of my own changes. It has its own site, personakit.me/trinity, where it is now in a private pilot by invitation. The repositories are private.

## Technical Details
- **Base**: Hermes Agent (open source, by Nous Research), private distribution
- **Memory**: an Obsidian vault under git for the agent's own record (work summaries, improvements, measurements and performance); PersonaKit for the memory shared between my agents and Claude Code
- **Interface**: WhatsApp and Telegram
- **Language**: Python and shell
- **Models**: OpenAI through Codex, or OpenRouter, depending on how the profile is set up

## Key Features
- Reading and preparing happen on their own; anything that sends, changes or removes something asks me first. Permanent deletion is not available to it at all
- Memory in three steps: a hook records every finished session in about 10 ms with no model call, a nightly run reads the day's evidence and updates the curated pages, and the result is one commit a person can review
- The nightly run must declare which sources it covered and which pages it changed, and code checks that declaration before the run counts
- A task ledger keeps short, redacted summaries of completed work and turns repeated patterns into proposals with evidence. It never promotes a skill, a hook or a memory on its own; a person approves
- A pattern only counts when it shows up on two different days, or three times in one day
- What runs live always equals a tagged commit, and changes from the upstream project come in only through a reviewed pull request

## Where to see it
- Trinity Agent's own site: [personakit.me/trinity](https://personakit.me/trinity)
- PersonaKit, its memory layer: [personakit.me](https://personakit.me), with the docs at [personakit.me/docs](https://personakit.me/docs)

## What it does alone, and what waits for me
- **On its own, no approval**: reading and preparing, such as summing up what is open with a supplier, a one-page brief for tomorrow's meeting, spotting a calendar clash, or drafting a reply in my style.
- **Asks first**: anything that sends, changes or removes something, such as sending a reply, moving or cancelling an event, booking a call or archiving an email.
- **Not available at all**: deleting an email for good, promoting a skill, hook or memory by itself (it proposes, a person approves), or reaching another person's account.

## How it is built
I write in a private WhatsApp or Telegram chat. The agent runs all the time on my computer and reads, searches, summarises and drafts on its own; anything that would send, change or remove stops at an "asks first" gate and waits for my tap. It acts in mail and calendar only when an account is connected, and it treats text inside an email as information, not instructions. Memory has two layers: the agent's own record in Obsidian under git, and PersonaKit as the memory shared by all my agents and developer tools.

## Three mechanisms that keep it trustworthy
- **Memory that proves itself**: each finished session is recorded in about 10 ms with no model call; a nightly run must declare which sources it covered and which pages it changed, code checks that, and the result is one reviewable commit.
- **Improvements only with evidence**: a pattern counts only on two different days or three times in one day, becomes a proposal with evidence, and goes in only if a person approves.
- **No message goes out without a tap**: it drafts, sends me the draft with a button, and sends only after I tap.

## Project Type
web-app

## Status
production

## Demo URL
https://personakit.me/trinity

## Repository
Private Repository

## Media
/projects/trinity-agent.png

## Featured
false

## Category
AI Agents & Automation
