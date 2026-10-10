# Home Visit — mobile blood-testing platform

A full-stack web application for a home blood-sample collection service.
Patients book a visit, a phlebotomist collects the sample at their address, a
laboratory processes it, and a verified PDF report is emailed back.

React + Vite frontend, Node/Express + MongoDB backend, four user roles,
real-time booking updates over Socket.io.

---

## Quick start

Requires **Node 18+** and a MongoDB database (local or Atlas).

```bash
git clone <your-repo-url>
cd homevisit

npm run install:all          # installs backend + frontend

cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
# edit backend/.env — at minimum MONGO_URI and JWT_SECRET

npm run dev                  # backend :5000 and frontend :5173 together
```

Open http://localhost:5173.

### Root scripts

| Command | What it does |
|---|---|
| `npm run install:all` | Install backend and frontend dependencies |
| `npm run dev` | Run both servers together |
| `npm run dev:api` / `npm run dev:web` | Run one side only |
| `npm run build` | Production build of the frontend |
| `npm start` | Start the backend |
| `npm test` | Backend test suite (41 tests) |
| `npm run seed` | Seed sample data — **guarded, see below** |
| `npm run audit` | `npm audit` on both packages |

---

## Environment variables

### `backend/.env`

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | **yes** | Must include a database name: `.../homevisit_dev?retryWrites=true` |
| `JWT_SECRET` | **yes** | Long random string. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d`. Accepts `15m`, `12h`, `7d`, or seconds. No refresh-token flow — on expiry the user signs in again. |
| `PORT` | no | Default `5000` |
| `NODE_ENV` | no | Set to `production` in deployment. Enables HSTS, silences debug logging, blocks the seed. |
| `CLIENT_URL` | **in production** | Your frontend origin. Drives CORS **and** the Socket.io CSP — see below. |
| `VERIFY_BASE_URL` | no | Printed on PDF reports as the verification link |
| `TWILIO_*` | no | Blank = SMS runs in mock mode (prints to console) |
| `EMAIL_*` | no | Blank = email runs in mock mode. Gmail needs an App Password. |
| `SEED_*_PASSWORD` | no | Fix a seed account's password; otherwise one is generated and printed once |

### `frontend/.env`

| Variable | Notes |
|---|---|
| `VITE_API_URL` | Backend URL **including `/api`**. Default `http://localhost:5000/api` |

> Vite inlines every `VITE_*` variable into the built bundle. **Anything in
> `frontend/.env` is public.** Never put a secret there.

### CORS and allowed origins

`CLIENT_URL` is the single switch controlling cross-origin access. It is used in
three places in `backend/server.js` and `backend/middleware/security.middleware.js`:

1. **Express CORS** — only this origin may call the API with credentials.
2. **Socket.io CORS** — only this origin may open a real-time connection.
3. **Helmet CSP `connect-src`** — this origin plus `ws:`/`wss:`.

If `CLIENT_URL` is wrong or unset in production you get a working-looking site
where **login fails and live updates never arrive**. Set it to your exact
frontend origin with no trailing slash, e.g. `https://your-app.vercel.app`.

Serving the frontend from more than one domain (apex + `www`, or a preview URL)
means editing those three places to accept an array.

---

## Deployment

### Database — MongoDB Atlas

1. Create a free M0 cluster.
2. Database Access → add a user with **Read and write to any database**.
3. Network Access → add `0.0.0.0/0` (Render has no static egress IP).
4. Copy the connection string and **append a database name**:
   `mongodb+srv://user:pass@cluster.mongodb.net/homevisit?retryWrites=true&w=majority`

### Backend — Render

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Add every backend variable above as an environment variable. Set
`NODE_ENV=production` and `CLIENT_URL` to your Vercel URL.

> **Free tier sleeps after ~15 minutes idle** and the next request takes 30–50
> seconds. The frontend handles this: it pings `/api/health` on load and shows
> "Waking up the server" after 3 seconds, retrying with backoff. A paid instance
> removes the delay.

### Frontend — Vercel

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

Set `VITE_API_URL` to `https://your-service.onrender.com/api`.
`vercel.json` already rewrites all routes to `index.html` for client-side routing.

**Deploy order:** backend first, so you have its URL for `VITE_API_URL`; then the
frontend; then go back and set `CLIENT_URL` on Render to the Vercel URL.

---

## Seeding

`npm run seed` **deletes every user and every test type**, then creates five
fictional accounts and six test types. Three gates run *before* it connects:

1. Refuses when `NODE_ENV=production`.
2. Refuses unless the database name contains `dev`, `test`, `local`, `sandbox`
   or `staging`. Override with `SEED_ALLOW_ANY_DB=yes` only if you are certain.
3. Requires you to type the database name to confirm. Non-interactive shells
   refuse unless `SEED_SKIP_CONFIRM=yes` (for CI).

Passwords are never stored in the repository. Set `SEED_*_PASSWORD` to choose
them, or let the script generate and print them once.

---

## Architecture

```
backend/
  config/      db connection, locale + pricing config
  controllers/ route handlers
  middleware/  auth, RBAC, rate limiting, security headers, uploads, errors
  models/      Mongoose schemas
  routes/      Express routers
  jobs/        subscription scheduler (node-cron)
  utils/       validators, formatters, PDF, email, SMS, logger, seed
  tests/       node:test suite
frontend/src/
  pages/       landing, auth, and four role dashboards
  components/  error boundary, notices
  context/     AuthContext
  hooks/       sockets, server health, motion
  utils/       axios instance, validators, formatters
  theme.css    design tokens — single source of truth
```

**Roles:** patient, phlebotomist, lab technician (MLT), admin.
**Booking lifecycle:** pending → confirmed → sample collected → processing → completed.

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Framer Motion |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + bcryptjs (12 rounds), token in `sessionStorage` |
| Real-time | Socket.io |
| Email / SMS | Nodemailer / Twilio (both optional, mock when unset) |
| PDF | PDFKit + bwip-js + qrcode |

### Security

Rate limiting on `/login` (10 failed attempts / 15 min), `/register` (5 / hour)
and `/change-password` (5 / hour). `trust proxy` is set to 1 for Render.
Helmet supplies CSP, HSTS (production), `nosniff` and frame protection.
Uploads accept PDF only, 10 MB maximum.

---

## Before you go live

Everything below is a deliberate placeholder. The code is complete; these are
business facts only the owner can supply. **Search the codebase for
`[PLACEHOLDER` to find them all.**

### Must be true before you publish — do not guess

| Where | What to supply |
|---|---|
| [backend/config/locale.js](backend/config/locale.js) | Registered address, contact phone, website. Currently printed on **every PDF report**. |
| [backend/config/locale.js](backend/config/locale.js) | **Test prices** — the six GBP values are invented placeholders. Set real ones and flip `pricesArePlaceholder` to `false`. |
| [backend/utils/reportGenerator.js](backend/utils/reportGenerator.js) | `VERIFY_BASE_URL` for the report verification link |
| [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx) | 4 markers: report turnaround, laboratory accreditation, phlebotomist qualifications, service-level commitments |
| [backend/config/locale.js](backend/config/locale.js) | `serviceAreaPrefixes` — currently `["CF"]` (Cardiff). Change for your area. |

### Needs a lawyer

| Where | What |
|---|---|
| [frontend/src/pages/Privacy.jsx](frontend/src/pages/Privacy.jsx) | **11** `[PLACEHOLDER - legal review needed]` sections: data controller, lawful basis, retention, processors, transfers |
| [frontend/src/pages/Terms.jsx](frontend/src/pages/Terms.jsx) | **14** sections: who provides the service, regulator registration, cancellation, liability, complaints, governing law |

Both pages carry a visible "draft, not reviewed by a lawyer" banner. **Nothing
in this application claims to be GDPR-compliant, and nothing should be added
that does** — compliance is a fact about your business, not a line of code.

### Needs a clinician

[CLINICAL_REVIEW.md](CLINICAL_REVIEW.md) lists **17 test parameters, 6
preparation instructions and 6 turnaround times. None has been reviewed.**
Units are `mg/dL` and `mill/cumm` (US convention) where UK laboratories
normally report SI units. Converting them is a clinical decision and has
deliberately not been attempted. A qualified person must sign this off before
any real patient result is reported.

### Known issues

- **Bundle size.** The frontend builds to ~624 kB in one chunk, over Vite's
  500 kB warning. Route-level code splitting is the fix and has not been done.
- **Dependency advisories.** See the dedicated section below.
- **No automated frontend tests.** The 41 tests cover backend validators,
  formatters, rate limiting and the seed guard.
- **Images.** 1.1 MB total; `image 5.png` is 660 kB for a logo shown at 54 px.

---

---

## Known dependency advisories

Audited with `npm audit fix` only — **never `--force`**, which would bump
majors and risk breaking real-time updates and routing.

Totals after fixing: backend **7**, frontend **11**. Most of that is the build
toolchain (chokidar, braces, micromatch, esbuild, postcss), which runs on your
machine and never reaches a user.

What actually ships is smaller. Production-only (`npm audit --omit=dev`):
**backend 4, frontend 2.** Every one needs a major version bump, so each is a
deliberate decision rather than an oversight.

### Backend — 4 (1 high, 3 moderate)

| Package | Severity | Why it is here | Non-breaking fix? |
|---|---|---|---|
| `nodemailer` ^6.10.1 | **high** | Direct dependency. 15 open advisories, including SMTP command injection via `envelope.size`, CRLF header injection, and delivery to attacker-controlled domains through IDN/punycode allow-list bypass. | **No.** Needs 10.1.0 — four majors up. |
| `node-cron` ^3.0.x | moderate | Direct dependency, used by the subscription scheduler. | **No.** Needs 4.6.0 (major). |
| `uuid` <11.1.1 | moderate | Transitive, pulled in by `node-cron`. Missing buffer bounds check in v3/v5/v6. | **No.** Resolves only with `node-cron` 4.6.0. |
| `qs` 6.14.2 | moderate | Transitive via `express` 4.22.1. DoS in `qs.stringify`, array-limit bypass. | **No**, despite what `npm audit` reports. Express pins `~6.14.0` (patch-only), and the fix needs ≥ 6.15.4 — unreachable without Express 5. |

> **Read the nodemailer one before you launch.** Email is a core feature here
> (booking confirmations, report delivery). The risk is mostly in handling
> untrusted recipient addresses — worth assessing against how your deployment
> actually uses it. Upgrading to v10 means an API review of
> `utils/emailService.js`, `utils/notify.js` and `utils/reportEmail.js`.

### Frontend — 2 (both moderate)

| Package | Severity | Why it is here | Non-breaking fix? |
|---|---|---|---|
| `react-router-dom` ^6.24.0 | moderate | Direct. Open redirect via backslash in `<Link>`/`useNavigate`. | **No.** Needs 7.18.4 (major); v7 changes the data-router API. |
| `react-router` | moderate | Transitive, same root cause and same fix. | **No.** |

`nodemailer` was also listed in `frontend/package.json` — a backend package that
was never imported by any frontend file. Removing it dropped the frontend from
3 production advisories to 2, including one **high**.

### If you want them cleared

`npm audit fix --force` resolves everything, but it bumps Express, Vite,
Tailwind, PostCSS, React Router and nodemailer across majors at once. Do it on
a branch, one package at a time, and re-test real-time booking updates,
routing and email after each.

---

## Licence

No licence file is included. Add one before distributing.
