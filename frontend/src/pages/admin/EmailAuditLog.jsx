import { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";
import { formatDate, formatDateTime } from "../../utils/format";
import { PageHeader, StatusPill, LoadingCards, EmptyState, ErrorState, DataTable, Card, Meta } from "../../dashboard/kit";
import { SAMPLE_STATUS, testNames } from "../../dashboard/status";

/**
 * Admin "Email & audit" tab:
 *   1. Email history — every report emailed to a patient
 *   2. Audit trail — the movement history of every sample
 */
export default function EmailAuditLog() {
  const [view,    setView]    = useState("emails");
  const [reports, setReports] = useState([]);
  const [samples, setSamples] = useState([]);
  const [status,  setStatus]  = useState("loading");
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.get("/reports"), api.get("/samples")]);
      setReports(r.data.reports || []);
      setSamples(s.data.samples || []);
      setError(""); setStatus("ready");
    } catch (e) {
      setError(e?.response?.data?.message || "Could not load the email and audit log.");
      setStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sent = reports.filter((r) => r.sentToPatient);
  const testsOf = (obj) => (obj?.sample ? testNames(obj.sample) : testNames(obj));

  return (
    <>
      <PageHeader eyebrow="Audit" title="Email & audit log." sub="Reports sent to patients, and every sample's movements." />

      <div className="db-seg" role="tablist" aria-label="Log view">
        {[{ id: "emails", label: `Email history (${sent.length})` }, { id: "audit", label: `Audit trail (${samples.length})` }].map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={view === t.id} onClick={() => setView(t.id)}>{t.label}</button>
        ))}
      </div>

      {status === "loading" ? <LoadingCards count={3} label="Loading the log" />
        : status === "error" ? <ErrorState message={error} onRetry={load} />
        : view === "emails" ? (
          <DataTable caption="Reports emailed to patients" rows={sent}
            empty={<EmptyState icon="mail" title="No reports emailed yet">Reports appear here once the lab sends them to a patient.</EmptyState>}
            columns={[
              { key: "p", header: "Patient", render: (r) => <><span className="db-cell-strong">{r.patient?.name || "—"}</span><span className="db-cell-sub">{r.patient?.email || "—"}</span></> },
              { key: "t", header: "Tests", render: (r) => testsOf(r) },
              { key: "id", header: "Report", render: (r) => <span className="db-code">{r.reportId}</span> },
              { key: "s", header: "Sent", render: (r) => formatDate(r.sentAt) },
              { key: "st", header: "Status", render: () => <span className="db-pill tone-green"><span className="db-pill-dot" />Sent</span> },
            ]} />
        ) : samples.length === 0
          ? <EmptyState icon="list" title="No sample activity yet">Each sample's movements are recorded here from collection to report.</EmptyState>
          : (
            <div className="db-stack">
              {samples.map((s, i) => (
                <Card key={s._id} i={i} tone={SAMPLE_STATUS[s.status]?.tone || "grey"}>
                  <div className="db-row">
                    <div className="db-row-main">
                      <h3 className="db-card-title">{s.patient?.name || "Patient"}</h3>
                      <div className="db-metas">
                        <span className="db-code">Sample {s.sampleId}</span>
                        <span className="db-code">Booking {s.booking?.bookingId || "—"}</span>
                        <Meta icon="tube">{testsOf(s)}</Meta>
                      </div>
                    </div>
                    <div className="db-row-side"><StatusPill status={s.status} kind="sample" /></div>
                  </div>
                  <hr className="db-divider" />
                  <ol className="db-tracker" aria-label="Movement history">
                    {(s.movements || []).map((m, j) => (
                      <li key={j} className="db-tracker-step is-done">
                        <span className="db-tracker-dot" aria-hidden="true">{j + 1}</span>
                        <span className="db-tracker-text">
                          <span className="db-tracker-label">{SAMPLE_STATUS[m.status]?.label || m.status}</span>
                          <span className="db-tracker-desc">
                            {m.by?.name ? `${m.by.name} (${m.by.role}) · ` : ""}{m.at ? formatDateTime(m.at) : ""}
                            {m.note ? ` · “${m.note}”` : ""}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>
              ))}
            </div>
          )}
    </>
  );
}
