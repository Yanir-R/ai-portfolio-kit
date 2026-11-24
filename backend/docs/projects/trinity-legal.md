# Trinity Legal

## Overview
A document and case management system, custom made for a small law office that specialises in real estate and land. It was specified in working sessions with lawyers who practise in that field, so the process inside the system follows how the office actually works and what it needs, not a generic template. That makes it a system fitted to one specific sector. It runs in the cloud, in Hebrew and right-to-left, and is in a live pilot with active clients.

Out of this work I now offer the same kind of tailored system to other small practices: law offices, accountants and similar professional offices.

At this stage it is full-stack product work and not yet AI work, and that is on purpose. It is how I build: first a system that works, then making sure it is reliable and does what the office needs and wants, and only after that adding AI on a base that has already proved itself. The system answers pains that many small offices know well: documents scattered across computers and email, not knowing which version is the latest, several people working on the same document, and information that has to stay safe and in order for years.

## Technical Details
- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Fastify 5, TypeScript
- **Database**: PostgreSQL 16 with row-level security
- **Desktop**: A .NET 10 add-on for Word and Excel on Windows
- **Cloud Platform**: Google Cloud - Cloud Run, Cloud SQL, Cloud Storage, Pub/Sub, Cloud Scheduler, Firebase Hosting
- **CI/CD**: GitHub Actions, secret scanning, AI code review on every pull request

## Key Features
- Several people can work on the same Word document without losing a version: edits are leased, commits are checked against the version they started from, and saved versions are never rewritten
- Each firm sees only its own data. The firm is taken from the session, enforced in the database on every route, and tested per endpoint
- Every uploaded file is scanned for malware before anyone can open it
- An existing archive of 56,607 files (33.8 GB) was imported with an audit trail, and a person approves what the importer could not decide
- Six scheduled jobs handle the background work

## Project Type
web-app

## Status
production

## Repository
Private Repository

## Featured
false

## Category
Full-Stack Development & Client Work
