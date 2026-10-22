# HemoVisit — mobile blood-testing platform

A full-stack web application for a home blood-sample collection service.
Patients book a visit, a phlebotomist collects the sample at their address, a
laboratory processes it, and the PDF report is made available to the patient.

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
# MONGO_URI must name a development database, e.g. .../hemovisit_dev

npm run dev                  # backend :5000 and frontend :5173 together
```

Open http://localhost:5173.

### Local database and the startup guard

For local development, point `MONGO_URI` in `backend/.env` at a **development**
database, never the live one. The database name is the path segment after the
host:

```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/hemovisit_dev?retryWrites=true&w=majority
                                                      ^^^^^^^^^^^^^
```

A local MongoDB works the same way: `mongodb://127.0.0.1:27017/hemovisit_dev`.

When `NODE_ENV` is anything other than `production`, the server checks that
name before it connects. If the name does not contain `dev`, `test`, `local`,
`sandbox` or `staging`, or there is no name at all, it refuses to start:

```
Refusing to connect: database "hemovisit" does not look like a development database. ...
```

`ALLOW_NON_DEV_DB=true` overrides the check for one run and prints a loud
warning. In production (`NODE_ENV=production`) the check is skipped, because the
deployed server is meant to use the live database. The startup log shows only
the database name, never the URI or password. The check lives in
`backend/utils/dbGuard.js`, and the seed script uses the same rule.

### Root scripts

| Command | What it does |
|---|---|
| `npm run install:all` | Install backend and frontend dependencies |
| `npm run dev` | Run both servers together |
| `npm run dev:api` / `npm run dev:web` | Run one side only |
| `npm run build` | Production build of the frontend |
| `npm start` | Start the backend |
| `npm test` | Backend test suite (93 tests) |
| `npm run seed` | Seed sample data — **guarded, see below** |
| `npm run create-user` | Create one admin or lab technician account, safe in production — see below |
| `npm run audit` | `npm audit` on both packages |

---

## Environment variables

### `backend/.env`

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | **yes** | Must include a database name: `.../hemovisit_dev?retryWrites=true`. Outside production the name must look like a development one — see [the startup guard](#local-database-and-the-startup-guard). |
| `ALLOW_NON_DEV_DB` | no | `true` lets a non-production server connect to a database whose name fails the guard. Logs a warning. Leave unset. |
| `JWT_SECRET` | **yes** | Long random string. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d`. Accepts `15m`, `12h`, `7d`, or seconds. No refresh-token flow — on expiry the user signs in again. |
| `PORT` | no | Default `5000` |
| `NODE_ENV` | no | Set to `production` in deployment. Enables HSTS, silences debug logging, blocks the seed. |
| `CLIENT_URL` | **in production** | Your frontend origin. Drives CORS **and** the Socket.io CSP — see below. |
| `VERIFY_BASE_URL` | no | Printed on PDF reports as the verification link |
| `TWILIO_*` | no | Blank = SMS runs in mock mode (prints to console) |
| `EMAIL_USER`, `EMAIL_PASS` | for real email | **All email is sent through Gmail**, signed in as `EMAIL_USER` with a Gmail App Password (`EMAIL_PASS`). The sender address patients see is always `EMAIL_USER`. Blank = mock mode: emails are built but not sent. |
| `EMAIL_FROM` | no | The sender's **display name only**, e.g. `HemoVisit`. The address is always `EMAIL_USER`. An older `Name <address>` value still works: the name is used, the address ignored. Unset = each email's own default name. |
| `ADMIN_EMAIL` | recommended | Recipient of the "new booking" alert. Unset = that alert fails (logged); patients' emails are unaffected. |
| `SEED_*_PASSWORD` | no | Fix a seed account's password; otherwise one is generated and printed once |

### `frontend/.env`

| Variable | Notes |
|---|---|
| `VITE_API_URL` | Backend URL **including `/api`**. Default `http://localhost:5000/api` |
| `VITE_DEMO_MODE` | `true` shows the demo panel on the login page. Default off. |
| `VITE_DEMO_PASSWORD` | Optional, for the demo panel's one-click buttons. **Public once built** — leave blank unless this is a demo deployment. |

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

**Step-by-step checklist, with every environment variable explained:
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).** The sections below are a summary.

### Database — MongoDB Atlas

1. Create a free M0 cluster.
2. Database Access → add a user with **Read and write to any database**.
3. Network Access → add `0.0.0.0/0` (Render has no static egress IP).
4. Copy the connection string and **append a database name**:
   `mongodb+srv://user:pass@cluster.mongodb.net/hemovisit?retryWrites=true&w=majority`

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
`npm run build` also pre-renders the landing page: the hero is in
`dist/index.html` and paints before the JavaScript runs, then hydrates.
`vercel.json` serves that file for `/` and `/home`, and `dist/app.html` (the
same shell, empty) for every other route, so other pages never download the
landing markup. `vite preview` applies the same rule (see `vite.config.js`).

Checks for the landing page, against `npm run build` + `npx vite preview`,
never the dev server (all write to the gitignored `docs/`):

| Script | What it checks |
|---|---|
| `node scripts/smoke-routes.mjs` | Every public route loads with no console errors (so no hydration mismatch); the landing hydrates instead of re-rendering; no other route shows landing markup; a signed-in visitor on `/` goes to their dashboard |
| `node scripts/landing-capture.mjs [--video] [--reduced]` | Section and full-page screenshots at 1440 and 390 after scrolling, content stuck invisible, overflow, console errors; `--video` records a 25 s scroll |
| `node scripts/lighthouse.mjs` | Lighthouse 13.5 on `/`, `/login`, `/register`; refuses to run against the dev server |

### End-to-end test (all four roles)

`npm run test:e2e` (in `frontend/`) drives real browsers through the whole
lifecycle: a patient registers and books, the admin sees it live and assigns a
phlebotomist, the phlebotomist sends the sample to the lab, the lab technician
processes it and uploads and sends a PDF, and the patient downloads it. The
patient's page is checked for each live status change without reloading. It
also checks a wrong password, a patient opening admin pages and admin API
routes, sign-in with a short pre-2026 password, the 404 page, an expired
session, and keyboard use (skip link, navigation, modal focus).

The same command also runs `e2e/forms.e2e.mjs`: it types into every text
field of every dialog and form (the four dashboards, sign-in and register)
one real keystroke at a time through the keyboard, and fails if focus leaves
the field being typed in, if any field ends up with another field's text, or
if closing a dialog does not return focus to the button that opened it.
Nothing is submitted.

Run it against a **development database only**:

1. `backend`: `EMAIL_USER= EMAIL_PASS= CLIENT_URL=http://localhost:4173 node server.js`
   and confirm it logs `database: hemovisit_dev`. Blank email credentials put
   email in mock mode, so no mail is sent.
2. `frontend`: `npm run build && npx vite preview --port 4173 --strictPort`
3. `frontend`: `npm run test:e2e`

The suite refuses to run unless `backend/.env`'s database name passes the same
guard as the server. It creates its own users (`e2e-<run>-…@example.com`) and
deletes them, their bookings, samples, reports and uploaded PDFs at the end,
pass or fail. Generated passwords and tokens are never printed. Screenshots of
every dashboard tab at 1440 and 390 px, and a ~30 s recording of the lifecycle
from the patient's view, go to `docs/screenshots/phase4/` (gitignored). The
register limiter allows five sign-ups per hour per IP; restart the backend
after five runs in an hour.

### API authorization tests

`npm run test:api` (in `frontend/`, same backend and database rules as above;
no browser or preview needed) calls the API directly with users it creates
for the run. It checks the password rule on every path that sets one, and
object-level access: patient A cannot read, change, cancel, rate or download
anything of patient B's (bookings, reports, profile, subscriptions); a
phlebotomist sees and acts only on bookings assigned to them; lab steps only
move forward and a report can be uploaded only while the sample is processing;
a normal user gets 403 on admin and staff routes; malformed or other users' IDs
give 403/404 without internals in the response; a deactivated account is
refused everywhere; sockets need a token and only join rooms the user is
entitled to. Each run makes two (refused) register attempts, which count
against the register limiter of five an hour; restart the backend if it trips.

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

### Creating admin and lab technician accounts

The admin dashboard creates phlebotomists, but not admins or lab technicians,
and the seed must never run against a real database. Use:

```bash
cd backend
npm run create-user
```

It prints the database name (never the URI) and you must type that name to
continue. Then it asks for the role (`admin` or `mlt`), name, email, a UK phone
number (required on every account) and the password twice, typed **with echo
off** and checked with the same rule as registration. It:

- applies the server's database guard: outside `NODE_ENV=production` the
  database name must look like a development one; in production it runs
  against the production database, which is how you create the first admin;
- only creates: an email that already has an account is refused and that
  account is left untouched;
- never prints or logs the password (it is stored only as the bcrypt hash);
- refuses to run without an interactive terminal.

On Render, run it from the service's Shell; see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), step 6.

---

## Demo mode (optional, off by default)

For a sales demo or a portfolio link, the login page can show a **"Try the
demo"** panel with one-click sign-in for all four roles.

```bash
# in frontend/.env
VITE_DEMO_MODE=true
```

The four buttons map to the accounts the seed creates — admin, patient,
phlebotomist and lab technician — so the database must have been seeded first.

### How credentials are handled

**A normal build contains no demo credentials at all.** Verified against the
built bundle: with `VITE_DEMO_MODE` unset, the account list, the emails and the
panel markup are all absent from `dist/`. Only the CSS rules remain, because
they sit in a static template literal Vite cannot tree-shake.

With the panel on but `VITE_DEMO_PASSWORD` blank, clicking a role fills in the
email and points you at the password printed by `npm run seed`. Still no
credential in the bundle.

Set `VITE_DEMO_PASSWORD` only on a throwaway demo deployment. Vite inlines every
`VITE_*` variable, so **that password becomes public** to anyone reading the
JavaScript. That is acceptable for a demo against a seeded dev database and
unacceptable for anything else.

Demo sign-in calls the same `login()` as the normal form — there is no separate
auth path and no bypass. Rate limiting still applies.

Cost: the panel adds **1.5 kB** to the bundle when enabled (641.5 kB → 642.9 kB).

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

**Access to records.** Every route checks the record, not only the role.
Someone else's record answers 404, as if it did not exist; a malformed ID is
also 404, and 500 responses carry a generic message (details go to the server
log only). Behaviour changes for API clients, all from the authorization audit:

- Phlebotomists see (`GET /api/bookings`) and change only bookings assigned to
  them; they may set `confirmed`, `rejected` and `sample_collected`, but not
  `processing` or `completed`, which follow the lab's steps. Patients may
  cancel only their own pending or confirmed bookings. A change from the wrong
  state is 409.
- `GET /api/bookings/verify/:bookingId` (barcode lookup) now requires sign-in
  as admin, lab technician or the assigned phlebotomist. It used to be public.
- `PATCH /api/samples/:id/status` only moves forward (`received`, then
  `processing`). `completed` comes only from sending the report.
  `POST /api/reports` needs the sample to be `processing`.
- `PATCH`/`DELETE /api/phlebotomists/:id` act only on phlebotomist accounts.
- Subscriptions: pause needs an active plan, resume a paused one; a cancelled
  plan cannot be resumed.
- `?status=` filters take a plain status name only, otherwise 400.

**Real-time (Socket.io).** A socket must send the same JWT as the API
(`io(origin, { auth: { token } })`) for an active account, or it is refused.
`join_booking` is honoured only for the booking's patient, its assigned
phlebotomist or an admin; `join_admin` only for admins. When an admin
deactivates an account (`PATCH /api/phlebotomists/:id` with `isActive: false`,
or `DELETE /api/phlebotomists/:id`), every open socket of that user is closed
at once, and reconnecting is refused.

### Report files (patient PDFs)

Report PDFs are patient health data and are **not public**.

- They are stored in `backend/uploads/reports/` (gitignored), which is **not
  served** as static files. The only way to fetch one is
  `GET /api/reports/:id/file`, which needs a signed-in user and allows only the
  patient the report belongs to (once it has been sent to them), the lab
  technician who uploaded it or is handling its sample, or an admin. Anyone
  else, or a malformed ID, gets `404 Report not found`.
- Uploads (`POST /api/reports`, field `report`) are held in memory, checked by
  content (the file must start with `%PDF-`, whatever its name or MIME type),
  limited to 10 MB, and saved under a server-generated name: 32 hex characters
  from `crypto.randomBytes`. Nothing the uploader sends reaches the path, and
  every lookup is checked to stay inside the folder (`utils/reportFiles.js`).
- `fileUrl` in API responses is now always `/api/reports/<id>/file` (relative
  to the API's origin). The frontend downloads with the user's token. The
  report email is a notification only: no PDF attached and no results, tests
  or lab comments in it, just a link to the signed-in reports page
  (`/user?tab=reports`; a signed-out patient signs in first and returns
  there). Sending is refused (409) if the report's file is missing.

**Before this change** the folder was served publicly at `/uploads/...` and file
names were a timestamp plus `Math.random()`. If you deployed that version:

1. Deploy this version. Old reports keep working straight away: their record
   holds the old URL and the server reads the file name from it. The old public
   URLs stop working.
2. Rename the old files to random names (dry run first; same database guard as
   the server):
   ```bash
   cd backend
   node utils/migrateReportFiles.js           # counts only, changes nothing
   node utils/migrateReportFiles.js --apply   # copy -> verify -> record -> delete old
   ```
   It is safe to re-run, prints counts only, and leaves a record untouched if
   any step fails. Run it where the files are (on Render: the service's shell).

Files are on the server's local disk. On a host with an ephemeral filesystem
(Render without a persistent disk), uploaded reports are lost on redeploy; add
a persistent disk or object storage before real use.

---

## Before you go live

Everything below is a business fact only the owner can supply. The public web
pages never show a placeholder: an unconfirmed fact is simply left out. The
backend still marks its gaps with `[PLACEHOLDER` (search for it); the gaps in
the legal pages are listed in [docs/LEGAL_TODO.md](docs/LEGAL_TODO.md).

### Must be true before you publish — do not guess

| Where | What to supply |
|---|---|
| [backend/config/locale.js](backend/config/locale.js) | Registered address, contact phone, website. Currently printed on **every PDF report**. |
| [backend/config/locale.js](backend/config/locale.js) | **Test prices** — the six GBP values are invented placeholders. Set real ones and flip `pricesArePlaceholder` to `false`. |
| [backend/utils/reportGenerator.js](backend/utils/reportGenerator.js) | `VERIFY_BASE_URL` for the report verification link |
| [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx) | Left out of the landing page until confirmed: report turnaround, laboratory accreditation, phlebotomist qualifications, service-level commitments. Add each back only once it is true. |
| [backend/config/locale.js](backend/config/locale.js) | `serviceAreaPrefixes` — currently `["CF"]` (Cardiff). Change for your area. |

### Needs a lawyer

| Where | What |
|---|---|
| [frontend/src/pages/Privacy.jsx](frontend/src/pages/Privacy.jsx) | **11** items to write, listed in [docs/LEGAL_TODO.md](docs/LEGAL_TODO.md): data controller, lawful basis, retention, processors, transfers |
| [frontend/src/pages/Terms.jsx](frontend/src/pages/Terms.jsx) | **14** items, same file: who provides the service, regulator registration, cancellation, liability, complaints, governing law |

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

- **Bundle size.** Routes are split. The shared first chunk is 238 kB (81 kB
  gzip). The landing page adds its own 14 kB of JS and 33 kB of CSS (7 kB gzip),
  which no other page downloads, plus a 17 kB below-the-fold chunk.
- **Dependency advisories.** See the dedicated section below.
- **Test coverage** (all passing on 2026-10-18). 93 backend tests (validators,
  formatters, rate limiting, the seed and startup database guards, email mock
  mode and the report notification, the sender name, the report generator and
  report files, the error handler, socket disconnects, `create-user`), 35
  frontend tests (render tests for
  every page, the landing's copy and numbers, the legal pages, the socket URL,
  sign-in return links, dialog focus), a 21-step browser end-to-end suite across
  all four roles, a 12-test browser sweep typing into every dialog and form, and 24 API tests for passwords and authorization (see above).
- **Images.** The hero ships as AVIF/WebP with a JPEG fallback. `image 5.png`
  (660 kB, an old logo with "HOME VISIT MOBILE LAB" baked in) is no longer used.

---

## Known limitations

These are true of the code as it stands. Each needs a decision or work before
real patients use the service.

- **Report files need a persistent disk or object storage in production.**
  Uploaded PDFs are written to `backend/uploads/reports` on the server's local
  disk. Render's default disk is wiped on every deploy and restart, so without
  a persistent disk mounted there (or a move to object storage) every uploaded
  report is lost. A report whose file is gone cannot be sent (409) or
  downloaded (404). Before it is sent the lab can upload it again; once it has
  been sent the sample is completed and the app accepts no new upload, so the
  file has to be restored to the disk from a backup. See
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **Seed reference ranges are unreviewed by a clinician.** The test catalogue
  created by `npm run seed` (parameters, units, reference ranges, preparation
  and turnaround) has not been checked by a qualified person; see
  [CLINICAL_REVIEW.md](CLINICAL_REVIEW.md). Nothing in the app shows these
  ranges to patients, and the PDF generator prints only results the lab enters.
- **One shared laboratory is assumed.** Every lab technician account sees the
  whole sample queue and every report, and any of them can send a report.
  Downloading a report's file is limited to the technician on that report. If
  you run more than one laboratory, samples and technicians need a lab field
  and the queries need to filter by it.
- **Dependency advisories are pending major upgrades.** Vite, Vitest and
  Tailwind (build and test tools, not shipped to users) need major-version
  upgrades to clear their advisories. In what does ship, `nodemailer` (one
  **high**), `node-cron` and `react-router` also need majors (`qs` was fixed
  with an Express patch release). Details, exposure and the suggested order
  are in the next section.

---

## Known dependency advisories

Measured with `npm audit` on 2026-10-18. Only non-breaking updates have been
applied; **never run `npm audit fix --force`**, which bumps majors across the
board. (Also avoid `npm audit fix --omit=dev`: it uninstalls the dev tools.)

| | All dependencies | Shipped / run in production (`--omit=dev`) |
|---|---|---|
| Backend | 6 (2 moderate, 4 high) | **3** (2 moderate, 1 high) |
| Frontend | 15 (7 moderate, 6 high, 2 critical) | **2** (2 moderate) |

Fixed without a major: `qs` (via Express). Express 4.22.3, a patch release,
moves it to 6.16.1, so the backend's production count went from 4 to 3.

### Left in what ships, and why

| Package | Severity | Why it is not fixed | Exposure here |
|---|---|---|---|
| `nodemailer` 6.10.1 (backend) | **high** | Every 6.x is affected; the fix is 10.1.7, four majors up. 6.10.1 is the last 6.x. | Advisories cover address parsing (mail to an unintended domain), CRLF header injection and SMTP envelope handling. Recipients here are addresses validated at registration; the sender name is sanitised (`utils/mailFrom.js`). Still the one to upgrade first: it needs a review of `utils/emailService.js` and `utils/reportEmail.js` against v10. |
| `node-cron` 3.0.3 and its `uuid` 8.3.2 (backend) | moderate | The fix is node-cron 4.6.0 (major). | The `uuid` advisory is a missing bounds check in v3/v5/v6 when a buffer is passed; node-cron only calls `uuid.v4()` with no buffer, so it does not apply as used. |
| `react-router` / `react-router-dom` 6.x (frontend) | moderate | Open redirect via a backslash in `<Link>` / `useNavigate`. Fixed only in 7.18.4 (major; v7 changes the router API). | Navigation targets in the app are fixed paths. The one built from a link, the return after sign-in (`utils/returnTo.js`), always uses the role's own dashboard path and only carries the query string over. |

### Left in the development tools (never shipped)

Vite 5, Vitest 2, Tailwind 3 and nodemon pull in the rest: esbuild and Vite's
dev server, Vitest's UI server and worker pool (the two **critical** ones,
`vitest` and `tinypool`), and chokidar / braces / micromatch / postcss
selector parsing. They run only on a developer's machine or in CI, never on
Render or in the browser. Each fix is a major upgrade (Vite 8, Vitest 5,
Tailwind 4, nodemon), deliberately not done now. Until then: do not run the
Vite dev server or the Vitest UI on a shared or public network.

### If you want them cleared

Do it on a branch, one package at a time: nodemailer first, then React Router
7, node-cron 4, then the build tools. After each, run every suite
(`npm test` in backend, `npx vitest run`, `npm run test:api` and
`npm run test:e2e` in frontend).

---

## Licence

No licence file is included. Add one before distributing.
