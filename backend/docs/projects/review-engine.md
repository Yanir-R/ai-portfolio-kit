# Review Engine

## Overview
An AI code reviewer that many repositories share. Each repository keeps one short configuration file, and every pull request gets a review and a clear verdict before it can merge. I use it on my own products and on client work. The code is private, so this page explains how it works instead of linking to it.

## How it works, in plain words
Think of a careful colleague who reads every change before it goes live. Three things make this one safe to rely on:

1. **It cannot touch anything.** The reviewer only writes its opinion into an outbox. A separate step, which holds the permissions, posts that opinion - and refuses to post anything that contains a secret.
2. **A new rule is measured before it decides.** For example, asking an independent checker about a blocking finding three times: today that vote runs on the side and is recorded, and it does not change a verdict until I decide it should.
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

## Who may do what
- **The AI reviewer** reads the change and writes its review to an outbox. It holds no access keys, cannot post to GitHub and cannot merge.
- **The publisher**, a separate step, posts the review using only the permissions it needs, and refuses anything that contains a secret.
- **The person who merges** merges only once there is a verdict for the exact version being merged.
- **Nobody in the change under review** can alter the reviewer's instructions: they are installed from the engine and checked before every run. Even a change to the engine is reviewed by its previous release.

## How it is built
A developer or a coding agent opens a pull request. The engine reads the repository's one settings file, installs the reviewer's instructions from the engine itself, and runs the AI reviewer (Claude Code) with no keys. The reviewer writes to an outbox; the publisher posts a clear verdict that names the version reviewed; then a person merges. Tokens and cost are logged for every round.

## Project Type
web-app

## Status
production

## Repository
Private Repository

## Media
/projects/review-engine.png

## Featured
false

## Category
AI Agents & Code Review
