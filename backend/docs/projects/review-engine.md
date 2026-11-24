# Review Engine

## Overview
An AI code reviewer that many repositories share. Each repository keeps one short configuration file, and every pull request gets a review and a clear verdict before it can merge. I use it on my own products and on client work. The code is private, so this page explains how it works instead of linking to it.

## How it works, in plain words
Think of a careful colleague who reads every change before it goes live. Three things make this one safe to rely on:

1. **It cannot touch anything.** The reviewer only writes its opinion into an outbox. A separate step, which holds the permissions, posts that opinion - and refuses to post anything that contains a secret.
2. **It does not block on a whim.** Before a finding is allowed to stop a change, an independent checker is asked about it three times.
3. **Silence is never a pass.** If the reviewer could not look at a change, the result is "could not look", never "clean".

## Technical Details
- **Platform**: A reusable GitHub Actions workflow on self-hosted runners
- **Reviewer**: Claude Code, with Codex as a fallback only when quota runs out
- **Language**: Python and Bash
- **Testing**: A guard corpus of 117 cases in four sets, plus the engine reviews its own pull requests

## Key Features
- One engine, any number of repositories, one config file each
- A verdict is reused when nothing in the inputs changed, so the same change does not get two different answers
- Token use and cost are recorded for every review round
- Every green change to the engine is released automatically with a version tag

## Project Type
web-app

## Status
production

## Repository
Private Repository

## Featured
false

## Category
AI Agents & Code Review
