# Trinity CRM

## Overview
An appointment and customer management app for hair salons, Hebrew-first and built for the phone. It is a full-stack project, not an AI showcase: a working prototype that runs entirely on Cloudflare's free services.

## Technical Details
- **Frontend**: React 19, Vite, React Router, TypeScript
- **Backend**: Hono on a single Cloudflare Worker
- **Database**: Cloudflare D1 with Drizzle ORM
- **Testing**: Vitest and Playwright audit scripts

## Key Features
- Many salons on one system, kept apart: the server decides which salon a request belongs to and never accepts that from the browser
- Public booking page per salon
- Completing an appointment is safe to repeat: it happens once, however many times the button is pressed
- Customers are grouped by how long it has been since their last visit, so the salon sees who is due and who is at risk of leaving
- SMS sits behind an interface and is mocked for now

## Project Type
web-app

## Status
in-development

## Repository
Private Repository

## Media
/projects/trinity-crm.png

## Featured
false

## Category
Full-Stack Development
