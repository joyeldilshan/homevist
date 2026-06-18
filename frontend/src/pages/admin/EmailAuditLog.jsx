import { useState, useEffect } from "react";
import api from "../../utils/api";

/**
 * EmailAuditLog — admin-side view with two sections:
 *   1. Email History — every report emailed to a patient
 *   2. Sample Audit Trail — full movement history of every sample
 *
 * Uses existing endpoints (admin is authorized on both):
 *   GET /reports  → all reports (email history)
 *   GET /samples  → all samples with movements[] (audit trail)
 *
 * Drop into your admin Dashboard.jsx as a new tab:
 *   import EmailAuditLog from "./EmailAuditLog";
 *   ...add tab { id:"audit", icon:"🗂", label:"Email & Audit" }
 *   ...{tab === "audit" && <EmailAuditLog />}
 */

const STEP_LABEL = {
  collected:    "Collected",
  sent_to_lab:  "Sent to Lab",
  received:     "Received at Lab",
  processing:   "Processing",
  completed:    "Completed",
};
const STEP_COLOR = {
  collected:   "#3182CE",
  sent_to_lab: "#3182CE",
  received:    "#805AD5",
  processing:  "#D69E2E",
  completed:   "#38A169",
};

export default function EmailAuditLog() {
  const [view,    setView]    = useState("emails"); // emails | audit
  const [reports, setReports] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([ api.get("/reports"), api.get("/samples") ]);
      setReports(r.data.reports || []);
      setSamples(s.data.samples || []);
    } catch (e) {
      console.error(e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sentReports = reports.filter(r => r.sentToPatient);
  const testNames   = (obj) => obj?.sample?.testTypes?.map(t => t.name).join(", ")
                          || obj?.testTypes?.map(t => t.name).join(", ")
                          || "—";

  return (
    <div className="fade-up">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>
          Email &amp; Audit Log
        </h1>
        <p style={{ color:"var(--text3)", fontSize:14 }}>Track sent reports and full sample movement history</p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {[
          { id:"emails", label:`📧 Email History (${sentReports.length})` },
          { id:"audit",  label:`🗂 Audit Trail (${samples.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            style={{ padding:"9px 18px", borderRadius:10, border:"1.5px solid", borderColor:view===t.id?"var(--red)":"var(--border)", background:view===t.id?"var(--red-light)":"#fff", color:view===t.id?"var(--red)":"var(--text2)", fontFamily:"var(--font)", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"var(--text3)" }}>⏳ Loading...</div>
      ) : view === "emails" ? (
        /* ── EMAIL HISTORY ── */
        sentReports.length === 0 ? (
          <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"60px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ fontWeight:600, color:"var(--text2)" }}>No reports emailed yet</div>
          </div>
        ) : (
          <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1.6fr 1.4fr 1fr 1fr", padding:"12px 18px", background:"var(--bg)", borderBottom:"1px solid var(--border)" }}>
              {["Patient","Tests","Report ID","Sent","Status"].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight:700, color:"var(--text4)", textTransform:"uppercase", letterSpacing:1 }}>{h}</div>
              ))}
            </div>
            {sentReports.map(r => (
              <div key={r._id} style={{ display:"grid", gridTemplateColumns:"1.4fr 1.6fr 1.4fr 1fr 1fr", padding:"14px 18px", borderBottom:"1px solid var(--border)", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{r.patient?.name || "—"}</div>
                  <div style={{ fontSize:11, color:"var(--text4)" }}>{r.patient?.email || "—"}</div>
                </div>
                <div style={{ fontSize:12, color:"var(--text2)" }}>{testNames(r)}</div>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--text3)" }}>{r.reportId}</div>
                <div style={{ fontSize:12, color:"var(--text3)" }}>{r.sentAt ? new Date(r.sentAt).toLocaleDateString() : "—"}</div>
                <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#F0FFF4", color:"#276749", border:"1px solid #C6F6D5", width:"fit-content" }}>
                  ✓ Sent
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── AUDIT TRAIL ── */
        samples.length === 0 ? (
          <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"60px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🗂</div>
            <div style={{ fontWeight:600, color:"var(--text2)" }}>No sample activity yet</div>
          </div>
        ) : (
          samples.map(s => (
            <div key={s._id} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"20px 22px", marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:16 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{s.patient?.name || "Patient"}</div>
                  <div style={{ fontSize:12, color:"var(--text3)" }}>
                    🔖 {s.sampleId} &nbsp;·&nbsp; Booking {s.booking?.bookingId || "—"} &nbsp;·&nbsp; {testNames(s)}
                  </div>
                </div>
                <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#fff", color:STEP_COLOR[s.status], border:`1px solid ${STEP_COLOR[s.status]}33` }}>
                  {STEP_LABEL[s.status] || s.status}
                </span>
              </div>

              {/* Movement timeline */}
              <div style={{ paddingTop:14, borderTop:"1px solid var(--border)" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--text4)", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Movement History</div>
                {(s.movements || []).map((m, i) => (
                  <div key={i} style={{ display:"flex", gap:12, paddingBottom:i < s.movements.length-1 ? 14 : 0, position:"relative" }}>
                    {/* Dot + line */}
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                      <div style={{ width:12, height:12, borderRadius:"50%", background:STEP_COLOR[m.status] || "var(--border2)", flexShrink:0, marginTop:3 }} />
                      {i < s.movements.length-1 && <div style={{ width:2, flex:1, background:"var(--border)", marginTop:2 }} />}
                    </div>
                    <div style={{ paddingBottom:6 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>{STEP_LABEL[m.status] || m.status}</div>
                      <div style={{ fontSize:12, color:"var(--text3)", marginTop:1 }}>
                        {m.by?.name ? <>by {m.by.name} <span style={{ color:"var(--text4)" }}>({m.by.role})</span> · </> : ""}
                        {m.at ? new Date(m.at).toLocaleString() : ""}
                      </div>
                      {m.note && <div style={{ fontSize:12, color:"var(--text2)", marginTop:3, fontStyle:"italic" }}>"{m.note}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )
      )}
    </div>
  );
}