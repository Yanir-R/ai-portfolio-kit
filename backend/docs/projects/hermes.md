# Hermes

## Overview
My own always-on agent. It runs all day on my machine, keeps its memory in an Obsidian vault, and reaches me over Telegram. It is built on the open-source Hermes Agent by Nous Research, run as a private distribution with a small, named set of my own changes. Around it I built the parts that make an always-on agent trustworthy: a memory pipeline, a learning ledger and a nightly review. The repositories are private.

## Technical Details
- **Base**: Hermes Agent (open source, by Nous Research), private distribution
- **Memory**: An Obsidian vault under git
- **Interface**: Telegram
- **Language**: Python and shell
- **Models**: Claude first, Codex as a fallback when quota runs out

## Key Features
- Memory in three steps: a hook records every finished session in about 10 ms with no model call, a nightly run reads the day's evidence and updates the curated pages, and the result is one commit a person can review
- The nightly run must declare which sources it covered and which pages it changed, and code checks that declaration before the run counts
- A task ledger keeps short, redacted summaries of completed work and turns repeated patterns into proposals with evidence. It never promotes a skill, a hook or a memory on its own; a person approves
- A pattern only counts when it shows up on two different days, or three times in one day
- What runs live always equals a tagged commit, and changes from the upstream project come in only through a reviewed pull request

## Project Type
web-app

## Status
production

## Repository
Private Repository

## Featured
false

## Category
AI Agents & Automation
