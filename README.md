# PingWatch 🔍

> A production-grade API health monitoring platform that detects downtime, tracks latency anomalies, and delivers real-time alerts — built with Node.js, PostgreSQL, and React.

[![CI](https://github.com/moki3411h/pingwatch/actions/workflows/test.yml/badge.svg)](https://github.com/moki3411h/pingwatch/actions/workflows/test.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)](https://supabase.com)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Live Demo:** [https://pingwatch-git-main-winner015.vercel.app](https://pingwatch-git-main-winner015.vercel.app)  
**API:** [https://pingwatch-m4ve.onrender.com/health](https://pingwatch-m4ve.onrender.com/health)

---

## Screenshots

### Dashboard — Monitor Overview
![PingWatch Dashboard](<img width="1470" height="402" alt="Screenshot 2026-06-27 at 8 08 56 PM" src="https://github.com/user-attachments/assets/eff117d4-968d-4040-a002-6624d273556c" />
)
*Real-time monitor list showing uptime percentage, last latency, and check interval for each endpoint*

### Monitor Detail — Latency Chart
![Monitor Detail](./docs/monitor-detail.png)
*Per-monitor view with latency trend chart across the last 50 pings, p95 latency, and full ping history log*

---

## What PingWatch Does

PingWatch continuously pings your API endpoints on a configurable schedule, records response times and status codes, detects downtime through consecutive failure analysis, and fires alerts via email or webhook when incidents occur.

| Feature | Details |
|---|---|
| Health checks | Configurable interval (30s – 24h), timeout, expected status code |
| Concurrency | All checks run in parallel using `Promise.allSettled()` — one slow endpoint never blocks others |
| Incident detection | Creates incidents only after 3 consecutive failures — prevents false alerts from network blips |
| Alerting | Email (SMTP) and webhook POST with full incident payload |
| Dashboard | Real-time uptime %, average latency, p95 latency, total checks, Chart.js response time graph |
| Auth | JWT authentication with bcrypt (cost factor 12), timing-safe login to prevent user enumeration |
| Security | Helmet, CORS, rate limiting (10 auth attempts / 15 min), input validation via Joi |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              React SPA (Vercel)                  │
│         Dashboard · Monitor Detail · Incidents   │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS REST
┌──────────────────────▼──────────────────────────┐
│           Express.js API (Render)                │
│   Helmet · CORS · Rate Limiter · JWT Middleware  │
├──────────┬──────────────┬────────────────────────┤
│  /auth   │  /monitors   │  /incidents  /stats    │
└──────────┴──────┬───────┴────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Scheduler Service                   │
│   setInterval per monitor · Promise.allSettled   │
│   checker.service → ping → record → evaluate     │
└──────────┬──────────────────────┬───────────────┘
           │                      │
┌──────────▼──────────┐  ┌───────▼──────────────┐
│  PostgreSQL          │  │   Alert Service       │
│  (Supabase)          │  │   Email · Webhook     │
│  5 tables · 8 indexes│  └──────────────────────┘
└─────────────────────┘
```

---

## Database Schema

```sql
users          — authenticated accounts
monitors       — watched endpoints (url, interval, timeout, expected_status)
ping_logs      — every check result (status_code, latency_ms, is_success)
incidents      — downtime / high-latency events with resolution tracking
alert_history  — audit trail of every notification sent
```

**Key design decisions:**
- Composite index `(monitor_id, checked_at DESC)` on `ping_logs` — covers both filter and sort for per-monitor queries
- Partial index on `ping_logs WHERE is_success = false` — error-rate calculations scan only failed rows
- `ON DELETE CASCADE` on all foreign keys — deleting a monitor removes all its logs and incidents atomically
- UUIDs as primary keys — safe to expose in URLs, no enumeration attack surface

---

## Tech Stack

**Backend**
- Node.js 20, Express.js
- PostgreSQL (Supabase) with `pg` connection pool — no ORM, raw parameterized queries
- JWT + bcrypt authentication
- node-cron scheduler, axios HTTP client
- Nodemailer (email alerts), webhook POST delivery
- Helmet, express-rate-limit, Joi validation, Winston structured logging

**Frontend**
- React 18 (Vite), React Router
- Chart.js for latency trend visualization
- Axios API client

**Infrastructure**
- Backend: Render (auto-deploy from main branch)
- Frontend: Vercel (auto-deploy from main branch)
- CI: GitHub Actions — runs Jest + Supertest on every push

---

## API Reference

### Authentication
```
POST /api/auth/register    — create account { name, email, password }
POST /api/auth/login       — get JWT { email, password }
GET  /api/auth/me          — get current user (protected)
```

### Monitors
```
GET    /api/monitors           — list all monitors with uptime stats
POST   /api/monitors           — create monitor { name, url, interval_seconds, ... }
GET    /api/monitors/:id       — get single monitor
PATCH  /api/monitors/:id       — update monitor (partial update)
DELETE /api/monitors/:id       — delete monitor and cascade all data
GET    /api/monitors/:id/pings — ping history (last 50–200, configurable)
```

### Incidents
```
GET   /api/incidents           — list incidents (paginated)
PATCH /api/incidents/:id/resolve — manually resolve an incident
```

### Stats
```
GET /api/stats/overview        — total monitors, open incidents, avg latency, overall uptime %
```

All protected routes require `Authorization: Bearer <token>` header.

---

## Local Setup

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/moki3411h/pingwatch.git
cd pingwatch/backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
JWT_SECRET=your_64_char_random_secret
JWT_EXPIRES_IN=24h
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
FRONTEND_URL=http://localhost:5173
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run database migrations

Go to **Supabase → SQL Editor** and run the files in order:
```
backend/src/db/migrations/001_users.sql
backend/src/db/migrations/002_monitors.sql
backend/src/db/migrations/003_ping_logs.sql
backend/src/db/migrations/004_incidents.sql
backend/src/db/migrations/005_alert_history.sql
```

### 4. Start the backend

```bash
npm run dev
# Server running on http://localhost:3000
# Database connection verified
# Scheduler started
```

### 5. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
# Frontend running on http://localhost:5173
```

---

## Running Tests

```bash
cd backend
npm test
```

```
Test Suites: 3 passed, 3 total
Tests:       23 passed, 23 total
```

Test coverage:
- `auth.test.js` — register/login validation, JWT guard on protected routes
- `monitor.test.js` — CRUD auth protection
- `health.test.js` — API availability

---

## Deployment

### Backend → Render

1. Connect your GitHub repo to [Render](https://render.com)
2. Set **Build Command:** `npm install`
3. Set **Start Command:** `node server.js`
4. Add all environment variables from `.env` in Render dashboard
5. Render auto-deploys on every push to `main`

### Frontend → Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory:** `frontend`
3. Add environment variable: `VITE_API_URL=https://your-render-url.onrender.com`
4. Vercel auto-deploys on every push to `main`

---

## Project Structure

```
pingwatch/
├── backend/
│   ├── src/
│   │   ├── routes/         # auth, monitor, incident, stats
│   │   ├── controllers/    # HTTP handlers (no business logic)
│   │   ├── services/       # checker, scheduler, alert
│   │   ├── middleware/     # JWT auth, Joi validation
│   │   ├── db/
│   │   │   ├── pool.js     # pg connection pool (singleton)
│   │   │   └── migrations/ # 001–005 SQL files
│   │   ├── config/         # env validation, fail-fast on startup
│   │   ├── validators/     # Joi schemas
│   │   └── utils/          # Winston logger
│   ├── tests/              # Jest + Supertest
│   └── server.js           # entry point, graceful shutdown
├── frontend/
│   └── src/
│       ├── pages/          # Dashboard, MonitorDetail, Incidents
│       ├── components/     # shared UI
│       ├── hooks/          # data fetching
│       └── api/            # axios client
└── .github/
    └── workflows/
        └── test.yml        # CI: install → test on every push
```

---

## Engineering Decisions

**Why `Promise.allSettled()` not `Promise.all()`?**  
`Promise.all()` short-circuits on the first rejection — one timed-out endpoint would cancel all other checks. `Promise.allSettled()` waits for every promise regardless of outcome, collecting results independently. This is the correct primitive for fan-out health check workloads.

**Why raw SQL instead of an ORM?**  
An ORM abstracts away query structure, making it harder to reason about index usage and query cost. Raw parameterized queries with `pg` give full control and make the index strategy explicit. All queries use `$1, $2` placeholders — SQL injection is structurally impossible.

**Why 3 consecutive failures before an incident?**  
A single failed ping is statistically likely to be a transient network issue. Requiring 3 consecutive failures before creating an incident trades ~3 minutes of alert delay for a near-zero false positive rate. This threshold is configurable via `FAILURE_THRESHOLD` in config.

**Why UUIDs as primary keys?**  
Integer IDs are enumerable — a user can iterate `/api/monitors/1`, `/api/monitors/2` to access others' data. UUIDs prevent this enumeration attack. They also allow client-side ID generation in future offline-first features.

---

## Future Improvements

- [ ] Response body validation (assert JSON schema of API response)
- [ ] Multi-region checks (detect region-specific outages)
- [ ] Status page (public-facing uptime page per monitor)
- [ ] Slack and PagerDuty alert channels
- [ ] Table partitioning on `ping_logs` by month for long-term data retention
- [ ] WebSocket push for real-time dashboard updates without polling

---

## Author

**Mokesh P**  
B.Tech Computer Science (IoT) · SRM Institute of Science and Technology · Class of 2028  
[GitHub](https://github.com/moki3411h) · [LeetCode](https://leetcode.com/u/DoFVIiQVvr/)

---

*Built as a portfolio project demonstrating backend engineering fundamentals: concurrent scheduling, relational database design, REST API architecture, JWT authentication, and CI/CD pipeline.*
