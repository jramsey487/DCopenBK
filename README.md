# DCopenBK - Ballcrew App

---

A full-stack web application for managing ball kids at the **Mubadala DC Open** tennis tournament. It handles check-in/check-out, team assignment, court scheduling, peer ratings, analytics, and more — across three user roles with distinct permissions.

---

## Deployment configuration

The production app is hosted at **https://dcopenbk.fly.dev**. Django now requires explicit production `SECRET_KEY` and `DATABASE_URL` values; it will stop with a clear configuration error rather than falling back to a known development key or SQLite. The default canonical site URL, allowed host, and CSRF origin are all set to the Fly.io hostname. Custom hostnames can be added through `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `DOMAIN`, and `SITE_BASE_URL` environment variables.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [User Roles & Permissions](#user-roles--permissions)
- [Features](#features)
- [Local Development](#local-development)
- [Deployment](#deployment)

---

## Overview

DCopenBK is used by tournament staff (chairpersons) and team captains to run the ball kid program at the Mubadala DC Open. During the tournament, ball kids check in daily, get assigned to court teams, and are rated by their captains. The app tracks history across years and provides leaderboards and analytics to inform future assignments and cut decisions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.1, Django REST Framework |
| Database | PostgreSQL (psycopg2) |
| Auth | DRF Token Auth, Djoser, JWT (simplejwt) |
| Rating calibration | Vendored `rcal` review-calibration library (`api/calibration/`) |
| Frontend | React 18, Material UI (MUI v5), Chart.js |
| Drag & Drop | react-dnd |
| Routing | react-router-dom v6 |
| Server | Gunicorn, WhiteNoise (static files) |
| Deployment | Docker, Fly.io |
| CI | GitHub Actions |

---

## Project Structure

```
DCopenBK/
├── citiopen/           # Django project settings, root URLs, WSGI/ASGI
├── api/
│   ├── models/
│   │   ├── ballkid.py  # Ballkid + all history/analytics models
│   │   ├── schedule.py # Schedule + Tournament models
│   │   ├── rating.py   # Rating + CalibrationParams models
│   │   └── enums.py    # Shared enums (positions, courts, match types, etc.)
│   ├── views/
│   │   ├── ballkid.py  # Ballkid, teams, analytics, tournament, banner endpoints
│   │   ├── schedule.py # Schedule CRUD endpoints
│   │   ├── rating.py   # Ratings + calibration endpoints
│   │   └── debug.py    # Bulk data seeding endpoints
│   ├── utils/
│   │   ├── teams_generator.py  # Algorithm for distributing ballkids across teams
│   │   ├── consts.py           # Constants and court mappings
│   │   └── utils.py            # Shared helpers
│   ├── serializers.py
│   ├── permissions.py  # IsChairperson, IsChairpersonOrCaptain, etc.
│   └── urls.py         # All API route definitions
├── accounts/           # Auth: registration, token login, role management
├── frontend/           # React SPA
│   └── src/components/
│       ├── auth/       # Login, forgot password, reset password
│       ├── ballkid/    # Ballkid profile pages, history charts
│       ├── lists/      # Check-in list, cut pages, inactive list, tickets
│       ├── teams/      # Regular + finals team assignment pages
│       ├── schedule/   # Schedule viewer and editor
│       ├── ratings/    # Rating forms and ratings grid
│       ├── leaderboards/  # All leaderboard views
│       └── settings/   # Account settings, tournament config, debug page
├── Dockerfile
├── fly.toml            # Fly.io deployment config (app: dcopenbk)
├── deploy.sh
├── scripts/
│   ├── setup.sh        # One-shot local setup (macOS / Linux)
│   └── setup.ps1       # One-shot local setup (Windows PowerShell)
├── .env.example
└── manage.py
```

---

## Deployment

The app is deployed to Fly.io as `dcopenbk` in region `iad`.

Fly secrets are not modified by this change. To inspect configured secret names without exposing values:

```bash
fly secrets list -a dcopenbk
```

The Docker image supplies build-only placeholder values for `collectstatic`; real production values are still required at runtime. Deploy only after the pull request is merged and you are ready to release.
