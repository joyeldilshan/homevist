import { useState, useEffect } from "react";
import api from "../../utils/api";

/**
 * EmailAuditLog — admin tab with two views:
 *   1. Email history — every report emailed to a patient
 *   2. Sample audit trail — full movement history of every sample
 * Rendered inside the admin dashboard as the "Email & Audit" tab.
 */

const CRIMSON  = "#A4133C";
const LAVENDER = "#7C6BAE";
const GOLD     = "#B8892E";
const TEAL     = "#1C7A6B";
const BLUE     = "#3E6C9E";
const GREEN    = "#2E7D57";

const STEP_LABEL = {
  collected:    "Collected",
  sent_to_lab:  "Sent to Lab",
  received:     "Received at Lab",
  processing:   "Processing",
  completed:    "Completed",
};
const STEP_COLOR = {
  collected:   BLUE,
  sent_to_lab: BLUE,
  received:    LAVENDER,
  processing:  GOLD,
  completed:   GREEN,
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
      <div className="head">
        <div className="sl">
          <div className="sl-cap" style={{ background:GOLD }} />
          <div className="sl-body">
            <span className="sl-code">HV-36</span>
            <span className="sl-name">Audit</span>
            <span className="sl-bar" />
          </div>
        </div>
        <h1>Email &amp; audit log.</h1>
        <p className="sub">Track sent reports and full sample movement history</p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { id:"emails", label:`📧 Email history (${sentReports.length})` },
          { id:"audit",  label:`🗂 Audit trail (${samples.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            style={{
              padding:"9px 18px", borderRadius:9, cursor:"pointer",
              fontFamily:"var(--sansf)", fontWeight:600, fontSize:13,
              border:"1px solid", transition:"all .15s",
              borderColor: view===t.id ? "#171310" : "rgba(23,19,16,0.15)",
              background:  view===t.id ? "#171310" : "transparent",
              color:       view===t.id ? "#F3F0EA" : "rgba(23,19,16,0.6)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"var(--ink-40)" }}>⏳ Loading...</div>
      ) : view === "emails" ? (
        /* ── EMAIL HISTORY ── */
        sentReports.length === 0 ? (
          <div className="card" style={{ padding:"60px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ fontWeight:600, color:"var(--ink-60)" }}>No reports emailed yet</div>
          </div>
        ) : (
          <div className="table scrollx">
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1.6fr 1.4fr 1fr 1fr", padding:"11px 18px", background:"rgba(23,19,16,0.03)", borderBottom:"1px solid var(--rule)" }}>
                {["Patient","Tests","Report ID","Sent","Status"].map(h => (
                  <div key={h} className="th">{h}</div>
                ))}
              </div>
              {sentReports.map(r => (
                <div key={r._id} className="trow" style={{ display:"grid", gridTemplateColumns:"1.4fr 1.6fr 1.4fr 1fr 1fr" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{r.patient?.name || "—"}</div>
                    <div style={{ fontSize:11, color:"var(--ink-40)" }}>{r.patient?.email || "—"}</div>
                  </div>
                  <div style={{ fontSize:12, color:"var(--ink-60)" }}>{testNames(r)}</div>
                  <div style={{ fontFamily:"var(--monof)", fontSize:11.5, color:"var(--ink-60)" }}>{r.reportId}</div>
                  <div style={{ fontSize:12, color:"var(--ink-60)" }}>{r.sentAt ? new Date(r.sentAt).toLocaleDateString() : "—"}</div>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontFamily:"var(--monof)", fontSize:9.5, letterSpacing:"0.08em", textTransform:"uppercase", background:"rgba(46,125,87,0.10)", color:GREEN, border:"1px solid rgba(46,125,87,0.35)", width:"fit-content" }}>
                    ✓ Sent
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        /* ── AUDIT TRAIL ── */
        samples.length === 0 ? (
          <div className="card" style={{ padding:"60px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🗂</div>
            <div style={{ fontWeight:600, color:"var(--ink-60)" }}>No sample activity yet</div>
          </div>
        ) : (
          samples.map(s => (
            <div key={s._id} className="card" style={{ padding:"20px 22px", marginBottom:12, borderLeft:`4px solid ${STEP_COLOR[s.status] || CRIMSON}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:16 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{s.patient?.name || "Patient"}</div>
                  <div style={{ fontSize:12, color:"var(--ink-60)" }}>
                    <span style={{ fontFamily:"var(--monof)", fontSize:11 }}>🔖 {s.sampleId}</span> &nbsp;·&nbsp; Booking <span style={{ fontFamily:"var(--monof)", fontSize:11 }}>{s.booking?.bookingId || "—"}</span> &nbsp;·&nbsp; {testNames(s)}
                  </div>
                </div>
                <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontFamily:"var(--monof)", fontSize:9.5, letterSpacing:"0.08em", textTransform:"uppercase", color:STEP_COLOR[s.status] || CRIMSON, border:`1px solid ${STEP_COLOR[s.status] || CRIMSON}44`, background:`${STEP_COLOR[s.status] || CRIMSON}11` }}>
                  {STEP_LABEL[s.status] || s.status}
                </span>
              </div>

              {/* Movement timeline */}
              <div style={{ paddingTop:14, borderTop:"1px solid var(--rule)" }}>
                <div style={{ fontFamily:"var(--monof)", fontSize:9.5, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-40)", marginBottom:12 }}>Movement history</div>
                {(s.movements || []).map((m, i) => (
                  <div key={i} style={{ display:"flex", gap:12, paddingBottom:i < s.movements.length-1 ? 14 : 0, position:"relative" }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                      <div style={{ width:12, height:12, borderRadius:"50%", background:STEP_COLOR[m.status] || "rgba(23,19,16,0.25)", flexShrink:0, marginTop:3 }} />
                      {i < s.movements.length-1 && <div style={{ width:2, flex:1, background:"var(--rule)", marginTop:2 }} />}
                    </div>
                    <div style={{ paddingBottom:6 }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>{STEP_LABEL[m.status] || m.status}</div>
                      <div style={{ fontSize:12, color:"var(--ink-60)", marginTop:1 }}>
                        {m.by?.name ? <>by {m.by.name} <span style={{ color:"var(--ink-40)" }}>({m.by.role})</span> · </> : ""}
                        {m.at ? new Date(m.at).toLocaleString() : ""}
                      </div>
                      {m.note && <div style={{ fontSize:12, color:"var(--ink-60)", marginTop:3, fontStyle:"italic" }}>"{m.note}"</div>}
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