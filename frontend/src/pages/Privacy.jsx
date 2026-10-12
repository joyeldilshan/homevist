import { Link } from "react-router-dom";
import locale from "../config/locale";

/**
 * Privacy Policy — DRAFT SCAFFOLD, NOT LEGAL ADVICE.
 *
 * Every section marked [PLACEHOLDER - legal review needed] must be written
 * and checked by a qualified person before this page is published.
 *
 * Nowhere does this page claim the service is GDPR-compliant. Do not add
 * such a claim — compliance is a matter of fact about the whole business,
 * not something a page can assert.
 */

const PH = "[PLACEHOLDER - legal review needed]";

const SECTIONS = [
  {
    h: "1. Who we are",
    body: [
      `The data controller for the information described here is ${PH} (registered name, company number and registered address).`,
      `You can contact us about this policy at ${PH} (contact address and email).`,
      `Data Protection Officer, if one is appointed: ${PH}`,
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
      `Our lawful basis for processing your personal data, and the separate condition we rely on for health data under Article 9: ${PH}`,
      `Whether we use your information for anything beyond delivering the service you asked for: ${PH}`,
    ],
  },
  {
    h: "4. Who we share it with",
    body: [
      `The laboratory that processes your sample: ${PH} (name, role, and the agreement we have with them).`,
      "We use Twilio to send SMS notifications and an email provider to send emails, where those are configured. Your name, phone number or email address and booking reference are shared with them for that purpose.",
      `Any other recipients, and whether any data leaves the UK: ${PH}`,
    ],
  },
  {
    h: "5. How long we keep it",
    body: [
      `Retention periods for your account, booking records and test results: ${PH}`,
      "Health records are normally subject to specific minimum retention periods. These must be confirmed before this policy is published.",
    ],
  },
  {
    h: "6. Your rights",
    body: [
      "Under UK data protection law you have rights over your information, including the right to ask for a copy of it, to have inaccurate information corrected, to object to or restrict how it is used, and in some circumstances to have it deleted.",
      `How to make such a request, and how long we take to respond: ${PH}`,
      "You can also complain to the Information Commissioner's Office (ICO), which regulates data protection in the UK, at ico.org.uk.",
    ],
  },
  {
    h: "7. How your information is stored",
    body: [
      "Your account and booking records are held in a hosted database. Your password is stored only as a salted hash and is never readable by us.",
      `Hosting location, security measures and breach procedures: ${PH}`,
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
      `How we will tell you about significant changes: ${PH}`,
    ],
  },
];

export default function Privacy() {
  return (
    <div style={{ background: "#F4F2ED", minHeight: "100vh", color: "#16211F" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 80px" }}>

        <Link to="/" style={{ fontSize: 13, color: "#0F6E62", textDecoration: "none" }}>
          ← Back to Home Visit
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
            It is a working scaffold, not a finished policy. Every section marked
            {" "}<code style={{ fontSize: 12.5 }}>[PLACEHOLDER - legal review needed]</code>{" "}
            must be completed and the whole document checked by someone qualified
            before this service is offered to real patients.
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
      </div>
    </div>
  );
}
