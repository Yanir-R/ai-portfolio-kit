# Trinity Legal

## Overview
Cloud document and case management for small law firms, in Hebrew and right-to-left. It is in a live pilot with active clients. This is full-stack product work rather than AI work: the hard parts are documents that several people edit, strict separation between firms, and moving a real archive into the cloud without losing anything. The client is not named here.

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
