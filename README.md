# citiopen

[![test](https://github.com/liandrea4/citiopen/actions/workflows/main.yml/badge.svg)](https://github.com/liandrea4/citiopen/actions/workflows/main.yml)

A full-stack web application for managing ball kids at the **Citi Open** tennis tournament. It handles check-in/check-out, team assignment, court scheduling, peer ratings, analytics, and more — across three user roles with distinct permissions.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [User Roles & Permissions](#user-roles--permissions)
- [Features](#features)
  - [Authentication](#authentication)
  - [Ballkid Management](#ballkid-management)
  - [Check-In / Check-Out](#check-in--check-out)
  - [Team Assignment](#team-assignment)
  - [Schedule Management](#schedule-management)
  - [Finals Teams](#finals-teams)
  - [Ratings System](#ratings-system)
  - [Analytics & Leaderboards](#analytics--leaderboards)
  - [Tournament Settings](#tournament-settings)
  - [Tickets](#tickets)
  - [Banners](#banners)
  - [Data Export & Debug Tools](#data-export--debug-tools)
- [API Reference](#api-reference)
- [Local Development](#local-development)
- [Deployment](#deployment)

---

## Overview

citiopen is used by tournament staff (chairpersons) and team captains to run the ball kid program at the Citi Open. During the tournament, ball kids check in daily, get assigned to court teams, and are rated by their captains. The app tracks history across years and provides leaderboards and analytics to inform future assignments and cut decisions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.1, Django REST Framework |
| Database | PostgreSQL (psycopg2) |
| Auth | DRF Token Auth, Djoser, JWT (simplejwt) |
| Rating calibration | [`rcal`](https://github.com/jtiosue/rcal) (custom git dependency) |
| Frontend | React 18, Material UI (MUI v5), Chart.js |
| Drag & Drop | react-dnd |
| Routing | react-router-dom v6 |
| Server | Gunicorn, WhiteNoise (static files) |
| Deployment | Docker, Fly.io |
| CI | GitHub Actions |

---

## Project Structure

```
citiopen/
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
├── fly.toml            # Fly.io deployment config (app: citiopenballkids)
├── deploy.sh
└── manage.py
```

---

## User Roles & Permissions

There are three roles, assigned via Django Groups:

| Role | Permissions |
|---|---|
| **Ballkid** | View own profile, view schedule and teams (when public), view leaderboards |
| **Captain** | All ballkid permissions + submit ratings, view their own ratings |
| **Chairperson** | Full access: manage all ballkids, create/modify schedules, manage teams, access all ratings and analytics, configure tournament settings, run debug tools |

Usernames are auto-generated as `firstname.lastname` (lowercase) when a user is registered.

---

## Features

### Authentication

- Token-based login via `POST /accounts/get-token` with `username` + `password`
- Returns an auth token, user group, and associated ballkid ID
- Password reset via email (Djoser)
- User registration is chairperson-only (`POST /accounts/register`)

**Frontend pages:** `LoginPage`, `ForgotPasswordPage`, `ResetPassword`, `ResetPasswordComplete`

---

### Ballkid Management

Each **Ballkid** record stores:

- **Static info:** first/last name, age, phone, emergency contact name/phone, years of experience, preferred position (Back / Net / Back-preferred / Net-preferred), profile image
- **Roles:** `is_captain`, `is_chairperson`, `is_out_of_town`
- **Status:** `is_active` (archived vs. current year), `is_cut`, `cut_status`
- **Transient state:** `is_checked_in`, `current_team`, `finals_team`, position, `finals_position`
- **Misc:** comments, checkout comments, `num_tickets`, `last_day`

**Cut statuses:** Definitely Keep, Possibly Keep, Possibly Cut, Definitely Cut, Self-Cut

**Key endpoints:**
- `GET /api/list` — all active ballkids
- `GET /api/sorted-list` — ballkids sorted by calibrated rating
- `GET /api/inactive-list` — archived (previous year) ballkids
- `GET /api/emails-list` — email addresses
- `POST /api/create-ballkid` — create a new ballkid (chairperson)
- `GET /api/get-ballkid/<id>` — get a single ballkid's profile
- `PATCH /api/update-ballkid` — update any ballkid field (chairperson)
- `PATCH /api/checkout-all` — check out all ballkids
- `PATCH /api/cut-all` — cut all ballkids
- `PATCH /api/archive-all` — archive all ballkids (end of year)

**Frontend pages:** `BallkidPage` (public view), `BallkidPageCaptain`, `BallkidPageChairperson`, `MyProfile`

---

### Check-In / Check-Out

When a ballkid checks in or out, the system automatically:

1. Creates/closes a `CheckinHistory` row with start, end, and duration
2. Marks whether it is the first check-in of the day (`is_first_checkin`)
3. If checking out, resets the ballkid's team to 0 (unassigned) and restores position to preferred position
4. Recalculates `CheckinAnalytics` (total duration + count of check-in days per year)

**Frontend pages:** `CheckinPage` (list of all ballkids with check-in toggles)

---

### Team Assignment

Chairpersons assign ballkids to numbered teams. The `TeamsGenerator` algorithm:

- Distributes checked-in, uncut ballkids across `N` teams
- Respects position preferences (Back vs. Net)
- Ensures each team has at least one experienced ballkid per position
- Experienced = captain, chairperson, 3+ years experience ("supervet"), or out-of-town non-rookie
- Uses a predefined strength ordering for court assignments when N ≥ 10

When a ballkid's team changes:
- `TeamHistory` is updated (start, end, duration per team)
- `CaptainHistory` is updated — tracks how long each ballkid spent under each captain

Teams can be hidden or shown to ballkids via `show_teams` on the Tournament model.

**Endpoints:**
- `POST /api/calc-num-teams` — calculate optimal number of teams
- `POST /api/create-teams` — run the algorithm and assign teams
- `PATCH /api/clear-team` — unassign a ballkid from their team
- `GET /api/get-past-finals/<year>` — past finals team assignments

**Frontend pages:** `TeamsPage`, `TeamsPageChairpersonDesktop`, `TeamsPageChairpersonMobile`

---

### Schedule Management

The **Schedule** model represents one team on one court during one hourly time slot.

Fields: `start` (datetime), `end` (datetime), `team` (int), `court` (string)

Courts: Stadium, Court 4, Harris, Court 5, Grandstand

Chairpersons can:
- Create a full day's schedule given a start time, number of teams, hours, and courts
- Delete an entire day's schedule
- Add or remove an hour from a day
- Add a court
- Update the team assignment for a specific slot
- Rename or remove a court
- End a court mid-day (clears remaining shifts, sets end time on current shift)
- Shift the entire schedule up or down by one hour

Ballkids and captains can view upcoming shifts (current + future assigned shifts).

**Endpoints:**
- `GET /api/get-schedule?date=MM/DD/YYYY`
- `POST /api/create-schedule`
- `DELETE /api/delete-schedule?date=MM/DD/YYYY`
- `POST /api/add-hour`, `DELETE /api/delete-hour`
- `POST /api/add-court`
- `PATCH /api/update-court-name`
- `PATCH /api/end-court`
- `PATCH /api/update-schedule`
- `PATCH /api/shift-schedule`
- `GET /api/get-next-shifts`

**Frontend pages:** `SchedulePage`, `SchedulePageChairperson`, `ScheduleTable`

---

### Finals Teams

Ballkids can be assigned to a finals match type: Men's Singles, Women's Singles, Men's Doubles, or Women's Doubles, and a finals position (Back or Net).

- `FinalsHistory` records each ballkid's finals assignment per year
- `FinalsAnalytics` tracks total count and most recent year for each match type per ballkid
- Finals teams can be hidden/shown independently from regular teams via `show_finals_teams`
- When finals teams are revealed, `FinalsHistory` entries are created; when hidden, they are deleted

**Frontend pages:** `FinalsTeamsPage`, `FinalsTeamsPageChairpersonDesktop/Mobile`, `PastFinalsTeamsPage`

---

### Ratings System

Captains and chairpersons rate ballkids on a numeric scale with an overall rating plus five sub-ratings:

| Sub-rating | Description |
|---|---|
| `athleticism_rating` | Physical ability |
| `rolling_rating` | Ball rolling / retrieval |
| `awareness_rating` | Court awareness |
| `decision_rating` | Decision-making |
| `effort_rating` | Effort and attitude |

**Rating lifecycle:**
1. **Draft** — saved in progress, not yet submitted
2. **Complete** — submitted rating, included in calibration
3. **Excluded** — manually excluded by chairperson (toggled off)
4. **Auto-excluded** — excluded by calibration algorithm (rater's bias > threshold)
5. **Deleted** — soft-deleted by chairperson

**Rating Calibration (`rcal`):**

The system uses the [`rcal`](https://github.com/jtiosue/rcal) library to correct for rater bias. The calibration pipeline:

1. Collects all Complete + Auto-excluded ratings since a configurable year threshold
2. Groups ratings into date buckets (configurable bucket size in days)
3. Builds a reviewer overlap graph; removes non-overlapping reviewers
4. Runs `calibrate_parameters` to compute per-rater scale and offset
5. Rescales parameters against the current year's ratings
6. Saves `CalibrationParams` for each rater (scale, offset, distance-to-ideal) and ratee (calibrated avg/stdev, improvement rate)
7. Auto-excludes raters whose `distance_to_ideal` exceeds the configured threshold
8. Recomputes ratee params using only non-excluded ratings

Calibration is triggered on `GET /api/calibrated-ratings/<year>`.

**Endpoints:**
- `POST /api/create-rating`
- `PATCH /api/save-draft-rating`
- `GET /api/get-draft-rating/<me>/<ballkid>`
- `GET /api/ratings/<year>` (chairperson)
- `GET /api/calibrated-ratings/<year>` (chairperson — triggers calibration)
- `GET /api/my-ratings/<id>` (captain/chairperson)
- `PATCH /api/exclude-rating/<id>`
- `PATCH /api/delete-rating/<id>`
- `GET /api/calibration-parameters/<id>` — per-ballkid calibration params
- `GET /api/calibration-parameters` — all rater params (captains + chairpersons)
- `GET /api/average-calibration-parameters`

**Frontend pages:** `RatingsPage`, `RatingsGrid`, `RatingDialog`, `MyRatingsPage`, `RateByCurrentTeamsPage`, `RateByNamePage`, `RateByPastTeamPage`

---

### Analytics & Leaderboards

**Check-in analytics:**
- `CheckinAnalytics` — total check-in duration and count of days per ballkid per year
- Average first-check-in time per ballkid
- Court time breakdown per ballkid (`CourtAnalytics`)

**Captain analytics:**
- `CaptainHistory` — time each ballkid spent under each captain
- `CaptainAnalytics` — total count and duration per (ballkid, captain, year) tuple

**Cut analytics:**
- `CutHistory` — furthest day survived before cut, per ballkid per year
- `FinalsHistory` / `FinalsAnalytics` — finals assignments per year and aggregate counts

**Leaderboard endpoints:**
- `GET /api/get-checkin-leaderboard` — most days checked in
- `GET /api/get-average-checkin-leaderboard` — earliest avg first check-in
- `GET /api/get-average-checkin-time/<id>`
- `GET /api/get-court-leaderboard` — most time on court
- `GET /api/get-average-court-leaderboard`
- `GET /api/get-ballkid-leaderboard` — ratings leaderboard by ballkid
- `GET /api/get-captain-leaderboard` — ratings leaderboard by captain
- `GET /api/get-checkins/<id>` — full check-in history for a ballkid
- `GET /api/get-checkin-court-analytics/<id>`
- `GET /api/get-captains/<id>` — captain breakdown for a ballkid
- `GET /api/get-cut-history/<id>`
- `GET /api/get-finals-history/<id>`
- `GET /api/get-finals-analytics/<id>`
- `GET /api/get-past-teams/<id>`

**Frontend pages:** `Leaderboards`, `BallkidLeaderboard`, `CaptainLeaderboard`, `CheckinLeaderboard`, `CourtLeaderboard`, `MatchLeaderboard`

**Per-ballkid charts:** `CheckinHistoryChart`, `CaptainHistoryChart`, `CourtHistoryChart`, `BallkidParamsChart`, `RaterParamsChart`

---

### Tournament Settings

The **Tournament** model (one row per year) stores:

- `start_date`, `end_date`
- `show_teams` — whether regular team assignments are visible to ballkids
- `show_finals_teams` — whether finals assignments are visible
- `on_rain_delay` — rain delay flag (displayed as a banner)
- Calibration parameters: `rcal_calibration_threshold`, `rcal_ignore_outliers`, `rcal_year_threshold`, `rcal_bucket_size`

**Endpoints:**
- `GET/POST/PATCH /api/get-tournament`

**Frontend page:** `TournamentSettings` (chairperson only)

---

### Tickets

The **Ticket** model tracks ticket allocations per ballkid per session (Sunday through Finals). Fields: `num_requested`, `num_granted`, `num_delivered`.

- `GET /api/ticket-list`
- `PATCH /api/update-ticket`

**Frontend page:** `TicketsPage`

---

### Banners

**Banner** messages can be sent to specific audiences (`all`, or a specific ballkid). Banners have a timestamp and an optional linked ballkid.

- `GET /api/banner-list`
- `PATCH /api/update-banner`

---

### Data Export & Debug Tools

**Export:**
- `GET /api/download` — download tournament data (chairperson only)

**Debug endpoints** (chairperson only — for seeding/resetting data):
- `POST /api/reset-data` — clear tournament data
- `POST /api/bulk-create-users`
- `POST /api/bulk-create-ballkids`
- `POST /api/bulk-create-signups`
- `POST /api/bulk-create-ratings`
- `POST /api/bulk-create-finals`
- `POST /api/bulk-create-cuts`
- `POST /api/bulk-create-checkins`
- `POST /api/bulk-checkin`
- History backfill: `create-checkin-history`, `create-team-history`, `create-captain-history`, `create-finals-history`, `create-cut-history`

**Frontend pages:** `DebugPage`, `FeedbackPage`, `GamePage`

---

## API Reference

All API routes are under `/api/`. Authentication uses token headers:

```
Authorization: Token <token>
```

Obtain a token via:
```
POST /accounts/get-token
Body: { "username": "first.last", "password": "..." }
```

---

## Local Development

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables (see citiopen/settings.py for required vars)
cp .env.example .env

# Run migrations
python manage.py migrate

# Start dev server
python manage.py runserver
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies API calls to localhost:8000)
npm start
```

The frontend proxy is configured in `package.json` to forward API requests to `http://localhost:8000`.

To build the frontend for production and move it to the Django static directory:
```bash
npm run relocate
```

---

## Deployment

The app is deployed to **Fly.io** as `citiopenballkids` (region: `iad`).

```bash
# Deploy
./deploy.sh
```

The Dockerfile:
1. Builds a Python 3.10 image
2. Installs all Python dependencies (including `rcal` from GitHub)
3. Runs `collectstatic`
4. Serves with Gunicorn on port 8000 (2 workers)

On each deploy, `python manage.py migrate` runs as a Fly.io release command.

Static files are served by WhiteNoise directly from Django.
