# Trinity Agent

## Overview
My own always-on AI assistant. It runs all day on my machine, and I talk to it in a private chat on WhatsApp or Telegram, like messaging a person. It learns how I work, does the groundwork before I ask, and checks with me only where it counts. Its memory layer is PersonaKit, my open-source memory tool. It is built on Hermes Agent, the open-source project by Nous Research, run as a private distribution with a small, named set of my own changes. It has its own site, personakit.me/trinity, where it is now in a private pilot by invitation. The repositories are private.

## Technical Details
- **Base**: Hermes Agent (open source, by Nous Research), private distribution
- **Memory layer**: PersonaKit, plus an Obsidian vault under git
- **Interface**: WhatsApp and Telegram
- **Language**: Python and shell
- **Models**: Claude first, Codex as a fallback when quota runs out

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

## Project Type
web-app

## Status
production

## Demo URL
https://personakit.me/trinity

## Repository
Private Repository

## Featured
false

## Category
AI Agents & Automation
