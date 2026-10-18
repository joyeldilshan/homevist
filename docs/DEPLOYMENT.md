# Deploying HemoVisit

A checklist for putting HemoVisit live: the database on MongoDB Atlas, the
backend (API and real-time updates) on Render, and the frontend on Vercel. Do
the steps in order. Several settings depend on a URL that only exists after
an earlier step.

Everything here describes the code on the `design-premium` branch. If a
setting below disagrees with what you see in the code, the code wins; please
fix this file.

---

## 0. Before you start

Decide these first. Each one blocks a later step.

- [ ] **Where uploaded reports will live.** Lab report PDFs are written to the
      backend's local disk (`backend/uploads/reports`). Render's default disk
      is wiped on every deploy and restart. You need a **Render persistent
      disk** (a paid instance type) or a move to object storage (code change,
      not done). Without one, every uploaded report is lost at the next deploy.
- [ ] **An email account to send from.** All patient and staff emails are sent
      through **Gmail**, signed in as `EMAIL_USER` with a Gmail **App Password**
      (`EMAIL_PASS`). There is no other mail server setting. The sender
      address patients see is always that Gmail account; `EMAIL_FROM` only
      changes the display name next to it.
- [ ] **The business facts** listed in the README under "Before you go live"
      (registered address, phone, website, real prices, service area). They
      are printed on every PDF report.
- [ ] **A clinician's sign-off** on the test catalogue
      ([CLINICAL_REVIEW.md](../CLINICAL_REVIEW.md)) before any real result is
      reported.

Never paste a connection string, password or secret into a chat, an issue or
this repository. Set them only in the Render and Vercel dashboards.

---

## 1. Database: MongoDB Atlas

- [ ] Create a cluster (M0 free tier is enough to start).
- [ ] **Database Access:** add a database user with read and write access.
- [ ] **Network Access:** allow `0.0.0.0/0`. Render has no fixed outbound IP
      address on most plans.
- [ ] Copy the connection string and **add the database name** before the
      `?`, for example
      `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/hemovisit?retryWrites=true&w=majority`.
      Without a name, the data goes into a database called `test`.
- [ ] Keep the production database (`hemovisit`) separate from development
      (`hemovisit_dev`). The server refuses a non-development name unless
      `NODE_ENV=production`, so a laptop cannot write to the live database by
      accident.

---

## 2. Backend: Render web service

### 2a. Service settings

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `npm start` (runs `node server.js`) |
| Health check path | `/api/health` |
| Instance type | One that supports a persistent disk (see 2b) |

### 2b. Persistent disk (required for reports)

- [ ] Add a disk and mount it at the backend's `uploads` folder. Render checks
      the repository out under `/opt/render/project/src`, so with root
      directory `backend` the mount path is
      **`/opt/render/project/src/backend/uploads`**. Open the service's Shell
      and run `pwd` to confirm the path before you rely on it.
- [ ] 1 GB is plenty to start: uploads are limited to 10 MB each.

### 2c. Environment variables

Set these in Render → the service → Environment. **Required** means the
service does not work correctly without it.

| Variable | Required | Value | What it does / what goes wrong |
|---|---|---|---|
| `NODE_ENV` | **yes** | `production` | Turns on HSTS and `upgrade-insecure-requests`, quiets debug logging, blocks `npm run seed`, and lets the server connect to a database whose name is not a development one. If it is unset, the startup guard **refuses** to connect to `hemovisit` and the service exits. |
| `MONGO_URI` | **yes** | The Atlas string from step 1, with the database name | Where all data is stored. If it is unset the server exits at startup. Only the database name is ever logged, never the URI. |
| `JWT_SECRET` | **yes** | A long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` | Signs and checks sign-in tokens for the API **and** the real-time connection. There is no startup check: if it is unset, every sign-in fails with a server error. Changing it signs everyone out. |
| `CLIENT_URL` | **yes** | Your exact frontend origin, no trailing slash, e.g. `https://your-app.vercel.app` | The **only** origin allowed to call the API (CORS), to open a real-time connection (Socket.io), and to connect under the page's content security policy. Also builds the links in emails (the patient's "view your report" link, the admin and phlebotomist dashboard links). If it is wrong, the site loads but **sign-in fails and live updates never arrive**. You do not know the Vercel URL yet: set a placeholder now and correct it in step 5. |
| `EMAIL_USER` | **yes, for real email** | The Gmail address you send from | The account that sends every email: booking confirmation, admin new-booking alert, phlebotomist assignment, "your report is ready". It is also the visible sender. If it or `EMAIL_PASS` is blank, email runs in **mock mode**: messages are built but never sent, with no error shown to users. |
| `EMAIL_PASS` | **yes, for real email** | A Gmail **App Password** for that account (not the account password) | Authenticates to Gmail. A wrong value makes each send fail. Failures are logged; bookings and reports still go through. |
| `ADMIN_EMAIL` | recommended | The mailbox that should hear about new bookings | Recipient of the "New booking" alert. If it is unset, that alert fails (logged) and the patient's confirmation is still sent. |
| `VERIFY_BASE_URL` | no | A URL on your site that can verify a booking ID, e.g. `https://your-app.vercel.app/verify` | When set, PDF reports print `Verify : <VERIFY_BASE_URL>/<bookingId>`. Leave it **unset** unless such a page exists: no verification page is built today, so a set value would print a dead link. |
| `JWT_EXPIRES_IN` | no | Default `7d`. Accepts `15m`, `12h`, `7d` or seconds | How long a sign-in lasts. There is no refresh flow; on expiry the user signs in again. The token is also cleared when the browser tab closes. |
| `PORT` | no | Leave unset | Render sets it. Locally the default is `5000`. |
| `TWILIO_ACCOUNT_SID` | no | From Twilio | With `TWILIO_AUTH_TOKEN`, enables SMS status messages to patients and phlebotomists. Blank = SMS **mock mode** (nothing sent). |
| `TWILIO_AUTH_TOKEN` | no | From Twilio | See above. |
| `TWILIO_PHONE_NUMBER` | with Twilio | Your Twilio sender number (a UK number for UK recipients) | The SMS sender. |
| `EMAIL_FROM` | no | A display name, e.g. `HemoVisit` | The **name** shown as the sender on every email. The address is always `EMAIL_USER`; you cannot send from another address with this. An older `Name <address>` value still works: only the name is used. If it is unset, each email uses its own default name ("HemoVisit 🩸", "HemoVisit Lab 🧬"). |

There is no mail server setting (`EMAIL_HOST`, `EMAIL_PORT` and similar are
not read by anything): email goes through Gmail.

**Do not set these in production.** They exist for local development, tests
and the seed:

| Variable | Why not |
|---|---|
| `ALLOW_NON_DEV_DB` | Lets a **non-production** server connect to a production-looking database. With `NODE_ENV=production` it is not needed. |
| `SEED_ALLOW_ANY_DB`, `SEED_SKIP_CONFIRM` | Bypass the seed's safety gates. The seed **deletes every user and test type**. |
| `SEED_ADMIN_PASSWORD`, `SEED_PATIENT_PASSWORD`, `SEED_PHLEBOTOMIST1_PASSWORD`, `SEED_PHLEBOTOMIST2_PASSWORD`, `SEED_LAB_PASSWORD` | Passwords for the seed's fictional accounts. They are used by nothing else. |

### 2d. First deploy

- [ ] Deploy. In the logs, look for `Connected to MongoDB, database: hemovisit`
      (your production name). If it says the guard refused, `NODE_ENV` is not
      `production`.
- [ ] Open `https://<your-service>.onrender.com/api/health`. It should return
      JSON with status 200.
- [ ] Note the service URL. You need it in step 3.

> **Free instances sleep after about 15 minutes idle.** The next request takes
> 30–50 seconds. The frontend shows "Waking up the server" and retries. A
> persistent disk needs a paid instance anyway, which does not sleep.

---

## 3. Frontend: Vercel project

### 3a. Project settings

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework preset | Vite |
| Build command | `npm run build` (also pre-renders the landing page) |
| Output directory | `dist` |

`frontend/vercel.json` is already in the repository. It serves the
pre-rendered landing for `/` and `/home`, and the app shell for every other
route, so links like `/user?tab=reports` work when opened directly.

### 3b. Environment variables

Vite copies every `VITE_*` value **into the public JavaScript** at build time.
Anything set here can be read by anyone, so never put a secret here. A change
only takes effect after a **redeploy** (rebuild).

| Variable | Required | Value | What it does / what goes wrong |
|---|---|---|---|
| `VITE_API_URL` | **yes** | `https://<your-service>.onrender.com/api`, **including `/api`** | Where the app sends every API request. The real-time (Socket.io) address is worked out from it (same origin, without `/api`). If it is unset, the built app calls `http://localhost:5000/api` and nothing works for real users. |
| `VITE_DEMO_MODE` | no | Leave **unset** | `true` shows a "Try the demo" panel with one-click sign-in for four roles. Only for a throwaway demo pointed at a seeded development database. |
| `VITE_DEMO_PASSWORD` | no | Leave **unset** | Password for those demo buttons. Being a `VITE_*` value, it is public in the bundle. |

- [ ] Deploy, and note the production URL (e.g. `https://your-app.vercel.app`).
      If you will use a custom domain, add it now and use that instead.

---

## 4. Point the backend at the frontend

- [ ] In Render, set `CLIENT_URL` to the exact frontend origin from step 3: the
      scheme and host, **no trailing slash, no path**.
- [ ] Save, then let Render redeploy.
- [ ] `CLIENT_URL` accepts **one** origin. Serving the app from two
      (e.g. apex and `www`, or Vercel preview URLs) needs a code change in
      `backend/server.js` and `backend/middleware/security.middleware.js`, or
      a redirect so users only ever see one.

---

## 5. Migrate existing report files (only if you deployed before)

Skip this on a brand-new deployment. It prints `legacyRecords: 0` and changes
nothing.

Earlier versions served report PDFs publicly from `/uploads/reports/...` with
guessable names. The current code already serves those old files through the
signed-in download route. This one-off script gives them random names.

In Render → the service → **Shell** (where the files are, with the service's
environment, so `NODE_ENV=production` and `MONGO_URI` are already set):

```bash
cd /opt/render/project/src/backend        # or wherever `pwd` showed in step 2b
node utils/migrateReportFiles.js           # dry run: counts only, changes nothing
node utils/migrateReportFiles.js --apply   # copy -> verify -> record -> delete old name
```

- [ ] Run the dry run first and read the counts. `fileMissing` above 0 means
      those PDFs were already lost (for example, to an earlier deploy without
      a persistent disk).
- [ ] Run `--apply`. It is safe to run again: records already migrated are
      skipped, and a failed step leaves that record and file as they were. It
      prints counts only, never patient data.

---

## 6. Create the first accounts

The seed is for development: it refuses to run in production and deletes
every user. The admin dashboard creates **test types, plans and
phlebotomists**. **Admins and lab technicians** are created with
`npm run create-user`, which is safe to run against production.

- [ ] In Render → the service → **Shell**:
      ```bash
      cd /opt/render/project/src/backend        # or wherever `pwd` showed in step 2b
      npm run create-user
      ```
      It prints the database name (never the URI) and asks you to type that
      name to continue. Then it asks for the role (`admin` or `mlt`), full
      name, email, a UK phone number (the account record requires one) and
      the password twice. The password is typed **with echo off**, must be at
      least 8 characters with a letter and a number, and is never printed or
      logged.
- [ ] It only creates. An email that already has an account is refused and
      that account is left as it was, so you cannot overwrite or demote
      anyone with it. Run it once per admin or lab technician.
- [ ] It needs an interactive terminal (the Render Shell is one). Piped or
      scripted input is refused.
- [ ] Sign in as the admin. Create the test catalogue (real, clinician-approved
      parameters and prices), any plans, and the phlebotomist accounts.

---

## 7. Check it end to end

- [ ] Open the frontend in a private window. The landing page loads and
      sign-in works. If sign-in fails with a network error, re-check
      `CLIENT_URL` and `VITE_API_URL`.
- [ ] Make a booking as a test patient. The admin dashboard shows it
      **without reloading**: that proves the real-time connection, so
      `CLIENT_URL` and `JWT_SECRET` are right.
- [ ] The booking confirmation email arrives (`EMAIL_USER`/`EMAIL_PASS`), and
      so does the admin alert (`ADMIN_EMAIL`).
- [ ] Take the booking through the phlebotomist and lab steps, upload a PDF
      and send it. The "your report is ready" email links to
      `<CLIENT_URL>/user?tab=reports`. Following it signed out leads to
      sign-in, then to the patient's reports. Download the PDF.
- [ ] Redeploy the backend, then download the same report again. If it now
      says the file is missing, the persistent disk is not mounted at the
      uploads folder (step 2b).
- [ ] Remove the test patient's data afterwards, or keep a clearly named test
      account.

---

## Quick reference

**Render (backend):** `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`,
`CLIENT_URL`, `EMAIL_USER`, `EMAIL_PASS`, `ADMIN_EMAIL`; optional
`EMAIL_FROM` (display name), `JWT_EXPIRES_IN`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_PHONE_NUMBER`, `VERIFY_BASE_URL` (only with a real verify page); a
persistent disk at `.../backend/uploads`.

**Vercel (frontend):** `VITE_API_URL=https://<service>.onrender.com/api`;
leave `VITE_DEMO_MODE` and `VITE_DEMO_PASSWORD` unset.

**Once, for the first admin (and each lab technician):** `npm run create-user`
in the Render Shell, from `backend/`.

**Once, after the first deploy of this version on a server that already had
reports:** `node utils/migrateReportFiles.js`, then
`node utils/migrateReportFiles.js --apply`.
