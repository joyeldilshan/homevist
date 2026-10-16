import { Link } from "react-router-dom";
import locale from "../config/locale";

/**
 * Privacy Policy — DRAFT SCAFFOLD, NOT LEGAL ADVICE.
 *
 * Sentences that still need a qualified person to write them are NOT
 * shown here as placeholders; they are listed in docs/LEGAL_TODO.md and
 * must be added, and the whole page reviewed, before it is published.
 *
 * Nowhere does this page claim the service is GDPR-compliant. Do not add
 * such a claim — compliance is a matter of fact about the whole business,
 * not something a page can assert.
 */

const SECTIONS = [
  {
    h: "1. Who we are",
    body: [
    ],
  },
  {
    h: "2. What information we collect",
    body: [
      "When you create an account and book a test, we collect: your name, email address, UK phone number, your address including postcode, and optionally your age and gender.",
      "When you book, we record which tests you selected, your appointment date and time, any notes you add, the amount charged and the status of your booking.",
      "When your sample is processed, we hold the resulting test results and the report produced from them.",
      "Health information — including your test results — is special category data under UK data protection law and needs additional protection.",
    ],
  },
  {
    h: "3. Why we use it, and our lawful basis",
    body: [
      "We use your contact details and address to arrange and carry out your home visit, and to send you booking confirmations and your report.",
    ],
  },
  {
    h: "4. Who we share it with",
    body: [
      "We use Twilio to send SMS notifications and an email provider to send emails, where those are configured. Your name, phone number or email address and booking reference are shared with them for that purpose.",
    ],
  },
  {
    h: "5. How long we keep it",
    body: [
      "Health records are normally subject to specific minimum retention periods. These must be confirmed before this policy is published.",
    ],
  },
  {
    h: "6. Your rights",
    body: [
      "Under UK data protection law you have rights over your information, including the right to ask for a copy of it, to have inaccurate information corrected, to object to or restrict how it is used, and in some circumstances to have it deleted.",
      "You can also complain to the Information Commissioner's Office (ICO), which regulates data protection in the UK, at ico.org.uk.",
    ],
  },
  {
    h: "7. How your information is stored",
    body: [
      "Your account and booking records are held in a hosted database. Your password is stored only as a salted hash and is never readable by us.",
    ],
  },
  {
    h: "8. Cookies and browser storage",
    body: [
      "This site does not set any cookies.",
      "When you sign in, we store a sign-in token and a copy of your account details in your browser's sessionStorage. This is what keeps you signed in as you move between pages. It is cleared automatically when you close the tab, and when you sign out.",
      "We do not use analytics, advertising or tracking of any kind.",
    ],
  },
  {
    h: "9. Changes to this policy",
    body: [
      `This policy is version ${locale.policyVersion}. When we change it we will update the version and record which version you agreed to.`,
    ],
  },
];

export default function Privacy() {
  return (
    <div style={{ background: "#F4F2ED", minHeight: "100vh", color: "#16211F" }}>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 80px" }}>

        <Link to="/" style={{ fontSize: 13, color: "#0F6E62", textDecoration: "none" }}>
          ← Back to HemoVisit
        </Link>

        <h1 style={{ fontFamily: "var(--display)", fontSize: 40, fontWeight: 900, margin: "24px 0 8px", letterSpacing: "-0.02em" }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: "rgba(22,33,31,0.62)", margin: 0 }}>
          Version {locale.policyVersion}
        </p>

        <div style={{ margin: "28px 0", padding: "16px 18px", background: "rgba(179,38,30,0.07)", border: "1px solid rgba(179,38,30,0.30)", borderRadius: 8 }}>
          <strong style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
            This is a draft and has not been reviewed by a lawyer.
          </strong>
          <span style={{ fontSize: 13.5, lineHeight: 1.65, color: "rgba(22,33,31,0.75)" }}>
            It is a working scaffold, not a finished policy. Several parts have
            still to be written, and the whole document must be checked by someone
            qualified before this service is offered to real patients.
          </span>
        </div>

        {SECTIONS.map((s) => (
          <section key={s.h} style={{ marginBottom: 30 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>{s.h}</h2>
            {s.body.map((p, i) => (
              <p key={i} style={{ fontSize: 14.5, lineHeight: 1.75, margin: "0 0 10px", color: "rgba(22,33,31,0.8)" }}>{p}</p>
            ))}
          </section>
        ))}

        <p style={{ fontSize: 13, color: "rgba(22,33,31,0.55)", marginTop: 40, paddingTop: 20, borderTop: "1px solid rgba(22,33,31,0.12)" }}>
          See also our <Link to="/terms" style={{ color: "#0F6E62" }}>Terms of Service</Link>.
        </p>
      </main>
    </div>
  );
}
