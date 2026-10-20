/**
 * Optional demo mode.
 *
 * OFF unless VITE_DEMO_MODE is exactly "true". When off, nothing here is
 * rendered and `DEMO_ACCOUNTS` is never read, so the panel and its
 * contents are dead code that Vite drops from the bundle.
 *
 * CREDENTIALS ARE NOT STORED HERE.
 *
 *   Emails are the fictional example.com addresses the seed creates
 *   (RFC 2606 reserved). They identify an account, they do not grant
 *   access to one, and they are already public in backend/utils/seed.js.
 *
 *   The password is read from VITE_DEMO_PASSWORD, which is unset by
 *   default. With it unset a click fills the email only and tells you
 *   where to get the password — so a normal production build ships no
 *   credential of any kind.
 *
 *   Set VITE_DEMO_PASSWORD only on a throwaway demo deployment pointed
 *   at a seeded development database. Anything in a VITE_* variable is
 *   inlined into the built bundle and is therefore public.
 *
 * These accounts exist only if `npm run seed` has been run, and the seed
 * refuses to touch anything that is not a dev/test/local database.
 */

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

/** Undefined unless explicitly provided at build time. */
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "";

/** One entry per role the application supports. */
export const DEMO_ACCOUNTS = [
  {
    role:  "admin",
    label: "Admin",
    email: "admin@example.com",
    blurb: "Assign phlebotomists, manage the catalogue, view the audit log",
  },
  {
    role:  "user",
    label: "Patient",
    email: "patient@example.com",
    blurb: "Book a test, track the visit, download a report",
  },
  {
    role:  "phlebotomist",
    label: "Phlebotomist",
    email: "phlebotomist1@example.com",
    blurb: "See assigned visits, set availability, update collections",
  },
  {
    role:  "mlt",
    label: "Lab technician",
    email: "lab@example.com",
    blurb: "Receive samples, record results, upload reports",
  },
];
