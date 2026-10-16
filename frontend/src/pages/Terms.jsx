import { Link } from "react-router-dom";

/**
 * Terms of Service — DRAFT SCAFFOLD, NOT LEGAL ADVICE.
 *
 * Sentences that still need a qualified person to write them are NOT
 * shown here as placeholders; they are listed in docs/LEGAL_TODO.md. Several
 * carry real regulatory weight for a health service and must not be
 * guessed at. Add them, and have the page reviewed, before publishing.
 */

const SECTIONS = [
  {
    h: "1. Who provides this service",
    body: [
    ],
  },
  {
    h: "2. What this service is — and is not",
    body: [
      "We arrange for a phlebotomist to visit your home, take a blood sample, and have it processed by a laboratory. We then make the resulting report available to you.",
      "This service does not provide a diagnosis and is not a substitute for medical advice. Your results should be discussed with your GP or another qualified clinician.",
      "If you feel unwell or are worried about your health, contact your GP, call NHS 111, or in an emergency call 999.",
    ],
  },
  {
    h: "3. Eligibility and service area",
    body: [
      "We currently visit addresses with postcodes starting CF, covering Cardiff and the surrounding South Wales area. We will tell you at the point of booking if we cannot reach your address.",
    ],
  },
  {
    h: "4. Booking, prices and payment",
    body: [
      "Prices are shown in pounds sterling when you book and include the tests you select.",
      "Prices currently shown in this application are examples and are not live commercial prices.",
    ],
  },
  {
    h: "5. Changing or cancelling an appointment",
    body: [
      "You can cancel a booking from your account.",
    ],
  },
  {
    h: "6. Your responsibilities",
    body: [
      "Please give accurate contact and address details, and follow any preparation instructions shown for your test — for example fasting before certain blood tests. An incorrect fasting period can make a result unusable.",
      "Please make sure the phlebotomist can safely access your home at the agreed time.",
    ],
  },
  {
    h: "7. Results and reports",
    body: [
      "Your report is produced from the laboratory's analysis of your sample and is delivered to you digitally.",
    ],
  },
  {
    h: "8. Liability",
    body: [
      "Nothing in these terms will limit liability for death or personal injury caused by negligence, or for anything else that cannot lawfully be excluded.",
    ],
  },
];

export default function Terms() {
  return (
    <div style={{ background: "#F4F2ED", minHeight: "100vh", color: "#16211F" }}>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 80px" }}>

        <Link to="/" style={{ fontSize: 13, color: "#0F6E62", textDecoration: "none" }}>
          ← Back to HemoVisit
        </Link>

        <h1 style={{ fontFamily: "var(--display)", fontSize: 40, fontWeight: 900, margin: "24px 0 8px", letterSpacing: "-0.02em" }}>
          Terms of Service
        </h1>

        <div style={{ margin: "28px 0", padding: "16px 18px", background: "rgba(179,38,30,0.07)", border: "1px solid rgba(179,38,30,0.30)", borderRadius: 8 }}>
          <strong style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
            This is a draft and has not been reviewed by a lawyer.
          </strong>
          <span style={{ fontSize: 13.5, lineHeight: 1.65, color: "rgba(22,33,31,0.75)" }}>
            It is a working scaffold, not finished terms. Several parts have
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
          See also our <Link to="/privacy" style={{ color: "#0F6E62" }}>Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
