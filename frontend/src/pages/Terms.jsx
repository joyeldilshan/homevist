import { Link } from "react-router-dom";

/**
 * Terms of Service — DRAFT SCAFFOLD, NOT LEGAL ADVICE.
 *
 * Every section marked [PLACEHOLDER - legal review needed] must be written
 * and checked by a qualified person before this page is published. Several
 * of these sections carry real regulatory weight for a health service and
 * must not be guessed at.
 */

const PH = "[PLACEHOLDER - legal review needed]";

const SECTIONS = [
  {
    h: "1. Who provides this service",
    body: [
      `This service is provided by ${PH} (registered name, company number, registered address).`,
      `Any registration with a healthcare regulator, and the registration number: ${PH}. Do not state a registration here unless it exists and can be evidenced.`,
    ],
  },
  {
    h: "2. What this service is — and is not",
    body: [
      "We arrange for a phlebotomist to visit your home, take a blood sample, and have it processed by a laboratory. We then make the resulting report available to you.",
      "This service does not provide a diagnosis and is not a substitute for medical advice. Your results should be discussed with your GP or another qualified clinician.",
      "If you feel unwell or are worried about your health, contact your GP, call NHS 111, or in an emergency call 999.",
      `Whether any clinician reviews or interprets your results as part of this service: ${PH}`,
    ],
  },
  {
    h: "3. Eligibility and service area",
    body: [
      "We currently visit addresses with postcodes starting CF, covering Cardiff and the surrounding South Wales area. We will tell you at the point of booking if we cannot reach your address.",
      `Minimum age, and arrangements for children or patients who lack capacity to consent: ${PH}`,
      `Any medical conditions or circumstances where we cannot collect a sample at home: ${PH}`,
    ],
  },
  {
    h: "4. Booking, prices and payment",
    body: [
      "Prices are shown in pounds sterling when you book and include the tests you select.",
      `Prices currently shown in this application are placeholders and are not live commercial prices: ${PH}`,
      `When payment is taken, accepted methods, and whether VAT applies: ${PH}`,
    ],
  },
  {
    h: "5. Changing or cancelling an appointment",
    body: [
      "You can cancel a booking from your account.",
      `Notice periods, cancellation charges and refund terms: ${PH}`,
      `What happens if our phlebotomist cannot attend, or nobody is home: ${PH}`,
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
      `Expected turnaround times and what happens if a result is delayed, unusable or needs repeating: ${PH}`,
      `How urgent or abnormal results are handled and escalated: ${PH} — this is important and must be defined by a clinician.`,
    ],
  },
  {
    h: "8. Liability",
    body: [
      `Limitations of liability: ${PH}`,
      "Nothing in these terms will limit liability for death or personal injury caused by negligence, or for anything else that cannot lawfully be excluded.",
    ],
  },
  {
    h: "9. Complaints",
    body: [
      `How to make a complaint, how long we take to respond, and how to escalate it: ${PH}`,
    ],
  },
  {
    h: "10. Governing law",
    body: [
      `Governing law and jurisdiction: ${PH}`,
    ],
  },
];

export default function Terms() {
  return (
    <div style={{ background: "#F4F2ED", minHeight: "100vh", color: "#16211F" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 80px" }}>

        <Link to="/" style={{ fontSize: 13, color: "#0F6E62", textDecoration: "none" }}>
          ← Back to Home Visit
        </Link>

        <h1 style={{ fontFamily: "var(--display)", fontSize: 40, fontWeight: 900, margin: "24px 0 8px", letterSpacing: "-0.02em" }}>
          Terms of Service
        </h1>

        <div style={{ margin: "28px 0", padding: "16px 18px", background: "rgba(179,38,30,0.07)", border: "1px solid rgba(179,38,30,0.30)", borderRadius: 8 }}>
          <strong style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
            This is a draft and has not been reviewed by a lawyer.
          </strong>
          <span style={{ fontSize: 13.5, lineHeight: 1.65, color: "rgba(22,33,31,0.75)" }}>
            It is a working scaffold, not finished terms. Every section marked
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
          See also our <Link to="/privacy" style={{ color: "#0F6E62" }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
