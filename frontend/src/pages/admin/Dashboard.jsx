import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAdminSocket } from "../../hooks/useSocket";
import api from "../../utils/api";
import toast from "react-hot-toast";
import EmailAuditLog from "./EmailAuditLog";
import { formatMoney, formatMoneyCompact, formatDate, formatLongDate, formatRating, formatRatingSummary } from "../../utils/format";
import { isValidPassword, PASSWORD_MESSAGE, PASSWORD_MIN } from "../../utils/validators";
import locale from "../../config/locale";
import {
  Shell, PageHeader, SectionTitle, Stats, StatusPill, LoadingCards, EmptyState, ErrorState,
  Button, Field, Modal, Meta, Card, DataTable,
} from "../../dashboard/kit";
import { BOOKING_STATUS, testNames } from "../../dashboard/status";

/**
 * Admin dashboard. Every API call is unchanged from the previous
 * version; the layout is the shared dashboard shell. New: live
 * "new booking" updates (useAdminSocket existed but was never used),
 * real tables, accessible modals instead of window.confirm.
 */

const NAV = [
  { id: "overview",      label: "Overview",       icon: "grid"     },
  { id: "bookings",      label: "All bookings",   short: "Bookings", icon: "list" },
  { id: "assign",        label: "Assign jobs",    short: "Assign",   icon: "target" },
  { id: "tests",         label: "Test catalogue", short: "Tests",    icon: "tube" },
  { id: "plans",         label: "Plans",          icon: "repeat"   },
  { id: "subscriptions", label: "Subscriptions",  icon: "calendar" },
  { id: "phlebotomists", label: "Phlebotomists",  icon: "users"    },
  { id: "analytics",     label: "Analytics",      icon: "chart"    },
  { id: "audit",         label: "Email & audit",  icon: "mail"     },
];

const CATS = ["haematology", "biochemistry", "microbiology", "immunology", "urine", "other"];
const patient = (b) => b?.user?.name || "Unknown patient";

const EMPTY_TEST = { name: "", code: "", price: "", duration: "24h", category: "haematology", preparation: "", description: "" };
const EMPTY_PHLE = { name: "", email: "", phone: "", password: "", serviceArea: "", licenseNumber: "" };
const EMPTY_PLAN = { name: "", description: "", testTypeIds: [], visitsPerCycle: "4", cycleLengthDays: "30", price: "" };

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab,           setTab]           = useState("overview");
  const [bookings,      setBookings]      = useState([]);
  const [phlebotomists, setPhlebotomists] = useState([]);
  const [testTypes,     setTestTypes]     = useState([]);
  const [plans,         setPlans]         = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [status,        setStatus]        = useState("loading");
  const [loadError,     setLoadError]     = useState("");

  const [assignFor,     setAssignFor]     = useState(null);
  const [testModal,     setTestModal]     = useState(false);
  const [editTestModal, setEditTestModal] = useState(null);
  const [phleModal,     setPhleModal]     = useState(false);
  const [editPhleModal, setEditPhleModal] = useState(null);
  const [planModal,     setPlanModal]     = useState(false);
  const [editPlanModal, setEditPlanModal] = useState(null);
  const [confirm,       setConfirm]       = useState(null);   // { title, body, action, label }

  const [newTest,  setNewTest]  = useState(EMPTY_TEST);
  const [editTest, setEditTest] = useState({});
  const [newPhle,  setNewPhle]  = useState(EMPTY_PHLE);
  const [editPhle, setEditPhle] = useState({});
  const [newPlan,  setNewPlan]  = useState(EMPTY_PLAN);
  const [editPlan, setEditPlan] = useState({});

  const fetchAll = useCallback(async () => {
    try {
      const [bRes, tRes, pRes, plRes, subRes] = await Promise.all([
        api.get("/bookings"), api.get("/test-types"), api.get("/phlebotomists"),
        api.get("/plans/all"), api.get("/subscriptions"),
      ]);
      setBookings(bRes.data.bookings || []);
      setTestTypes(tRes.data.testTypes || []);
      setPhlebotomists(pRes.data.phlebotomists || []);
      setPlans(plRes.data.plans || []);
      setSubscriptions(subRes.data.subscriptions || []);
      setLoadError(""); setStatus("ready");
    } catch (err) {
      setLoadError(err?.response?.data?.message || "Could not load dashboard data.");
      setStatus((s) => (s === "ready" ? s : "error"));
    }
  }, []);

  useEffect(() => { fetchAll(); }, [tab, fetchAll]);

  // Live: the server emits "new_booking" to the admin room.
  useAdminSocket((data) => {
    // Longer than the 2 s default: this one arrives unprompted.
    toast.success(`New booking${data?.bookingId ? ` ${data.bookingId}` : ""}${data?.patient ? ` from ${data.patient}` : ""}.`, { duration: 6000 });
    fetchAll();
  });

  const call = async (fn, ok, after) => {
    try { await fn(); toast.success(ok); after?.(); fetchAll(); }
    catch (err) { toast.error(err?.response?.data?.message || "That did not work."); }
  };

  const toggleTestId = (setter, id) =>
    setter((p) => ({ ...p, testTypeIds: p.testTypeIds?.includes(id) ? p.testTypeIds.filter((x) => x !== id) : [...(p.testTypeIds || []), id] }));

  const createPlan = () => {
    if (!newPlan.name || !newPlan.testTypeIds.length || !newPlan.visitsPerCycle || !newPlan.cycleLengthDays || !newPlan.price) {
      toast.error("Name, tests, visits per cycle, cycle length and price are required."); return;
    }
    call(() => api.post("/plans", { ...newPlan, visitsPerCycle: Number(newPlan.visitsPerCycle), cycleLengthDays: Number(newPlan.cycleLengthDays), price: Number(newPlan.price) }),
      "Plan added.", () => { setPlanModal(false); setNewPlan(EMPTY_PLAN); });
  };
  const saveEditPlan = () => call(
    () => api.put(`/plans/${editPlanModal._id}`, { ...editPlan, visitsPerCycle: Number(editPlan.visitsPerCycle), cycleLengthDays: Number(editPlan.cycleLengthDays), price: Number(editPlan.price) }),
    "Plan updated.", () => setEditPlanModal(null));
  const createTest = () => {
    if (!newTest.name || !newTest.code || !newTest.price) { toast.error("Name, code and price are required."); return; }
    call(() => api.post("/test-types", { ...newTest, code: newTest.code.toUpperCase(), price: Number(newTest.price) }),
      "Test added.", () => { setTestModal(false); setNewTest(EMPTY_TEST); });
  };
  const saveEditTest = () => call(() => api.put(`/test-types/${editTestModal._id}`, { ...editTest, price: Number(editTest.price) }),
    "Test updated.", () => setEditTestModal(null));
  const createPhle = () => {
    if (!newPhle.name || !newPhle.email || !newPhle.phone || !newPhle.password) { toast.error("Name, email, phone and password are required."); return; }
    // The create-phlebotomist route does not check password strength, so
    // the form applies the same rule as registration.
    if (!isValidPassword(newPhle.password)) { toast.error(PASSWORD_MESSAGE); return; }
    call(() => api.post("/phlebotomists", newPhle), "Phlebotomist account created.", () => { setPhleModal(false); setNewPhle(EMPTY_PHLE); });
  };
  const saveEditPhle = () => call(() => api.patch(`/phlebotomists/${editPhleModal._id}`, editPhle), "Phlebotomist updated.", () => setEditPhleModal(null));
  const assign = (bookingId, phlebotomistId) => call(() => api.patch(`/bookings/${bookingId}/assign`, { phlebotomistId }), "Phlebotomist assigned.", () => setAssignFor(null));
  const updateStatus = (id, s) => call(() => api.patch(`/bookings/${id}/status`, { status: s }), "Booking updated.");
  const markSubPaid = (id) => call(() => api.patch(`/subscriptions/${id}/mark-paid`), "Marked as paid.");
  const ask = (title, body, label, action) => setConfirm({ title, body, label, action });

  const safeB      = bookings.filter(Boolean);
  const revenue    = safeB.filter((b) => b.status === "completed").reduce((s, b) => s + (b.amount || 0), 0);
  const pending    = safeB.filter((b) => b.status === "pending");
  const completed  = safeB.filter((b) => b.status === "completed");
  const unassigned = safeB.filter((b) => !b.phlebotomist && b.status === "pending");
  const testCounts = testTypes.map((t) => ({ name: t?.name || "—", count: safeB.filter((b) => testNames(b).includes(t?.name)).length }))
    .filter((t) => t.count > 0).sort((a, b) => b.count - a.count);
  const statusCounts = Object.entries(BOOKING_STATUS).map(([k, c]) => ({ name: c.label, tone: c.tone, count: safeB.filter((b) => b.status === k).length }))
    .filter((x) => x.count > 0);

  const nav = NAV.map((n) => ({ ...n, badge: n.id === "assign" ? unassigned.length : 0 }));
  const signOut = () => { logout(); navigate("/login"); };
  const assignBooking = safeB.find((b) => b._id === assignFor);

  const bookingCols = [
    { key: "id", header: "Booking", render: (b) => <span className="db-code">{b.bookingId || "—"}</span> },
    { key: "patient", header: "Patient", render: (b) => <><span className="db-cell-strong">{patient(b)}</span><span className="db-cell-sub">{b.user?.phone || "—"}</span></> },
    { key: "tests", header: "Tests", render: (b) => testNames(b) },
    { key: "date", header: "Date", render: (b) => formatDate(b.appointmentDate) },
    { key: "amount", header: "Amount", render: (b) => formatMoney(b.amount) },
    { key: "status", header: "Status", render: (b) => <StatusPill status={b.status} /> },
    { key: "act", header: "Actions", render: (b) => (
      <span className="db-cell-actions">
        {b.status === "pending" && !b.phlebotomist && <Button size="sm" onClick={() => setAssignFor(b._id)}>Assign</Button>}
        {b.status === "pending" && <Button size="sm" variant="soft" onClick={() => updateStatus(b._id, "confirmed")}>Confirm</Button>}
        {b.status === "processing" && <Button size="sm" variant="soft" onClick={() => updateStatus(b._id, "completed")}>Complete</Button>}
        {!["pending", "processing"].includes(b.status) && <span className="db-fineprint">—</span>}
      </span>
    ) },
  ];

  const loadingOrError = status === "loading" ? <LoadingCards count={4} label="Loading the dashboard" />
    : status === "error" ? <ErrorState message={loadError} onRetry={fetchAll} /> : null;

  const testForm = (val, set, withCode) => (
    <>
      <Field label="Test name"><input placeholder="e.g. Full blood count" value={val.name || ""} onChange={(e) => set((p) => ({ ...p, name: e.target.value }))} /></Field>
      <div className="db-grid-2">
        {withCode && <Field label="Code"><input placeholder="e.g. CBC" value={val.code || ""} onChange={(e) => set((p) => ({ ...p, code: e.target.value }))} /></Field>}
        <Field label="Price (£)"><input type="number" min="0" step="0.01" placeholder="e.g. 25.00" value={val.price ?? ""} onChange={(e) => set((p) => ({ ...p, price: e.target.value }))} /></Field>
        <Field label="Turnaround"><input placeholder="e.g. 24h" value={val.duration || ""} onChange={(e) => set((p) => ({ ...p, duration: e.target.value }))} /></Field>
        <Field label="Category">
          <select value={val.category || "haematology"} onChange={(e) => set((p) => ({ ...p, category: e.target.value }))}>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Preparation"><input placeholder="e.g. Fast for 8 hours" value={val.preparation || ""} onChange={(e) => set((p) => ({ ...p, preparation: e.target.value }))} /></Field>
    </>
  );

  const planForm = (val, set) => (
    <>
      <Field label="Plan name"><input placeholder="e.g. Monthly care plan" value={val.name || ""} onChange={(e) => set((p) => ({ ...p, name: e.target.value }))} /></Field>
      <Field label="Description (optional)"><input value={val.description || ""} onChange={(e) => set((p) => ({ ...p, description: e.target.value }))} /></Field>
      <div className="db-grid-2">
        <Field label="Visits per cycle"><input type="number" min="1" value={val.visitsPerCycle ?? ""} onChange={(e) => set((p) => ({ ...p, visitsPerCycle: e.target.value }))} /></Field>
        <Field label="Cycle length (days)"><input type="number" min="1" value={val.cycleLengthDays ?? ""} onChange={(e) => set((p) => ({ ...p, cycleLengthDays: e.target.value }))} /></Field>
      </div>
      <Field label="Price per cycle (£)"><input type="number" min="0" step="0.01" value={val.price ?? ""} onChange={(e) => set((p) => ({ ...p, price: e.target.value }))} /></Field>
      <fieldset className="db-field" style={{ border: 0, padding: 0, margin: "0 0 18px" }}>
        <legend className="db-label" style={{ marginBottom: 8 }}>Tests included in every visit</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {testTypes.map((t) => (
            <label key={t._id} className="db-check">
              <input type="checkbox" checked={val.testTypeIds?.includes(t._id) || false} onChange={() => toggleTestId(set, t._id)} />
              {t.name}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );

  return (
    <Shell role="Admin" items={nav} active={tab} onNavigate={setTab} user={user} onSignOut={signOut} live>
      {tab === "overview" && (
        <>
          <PageHeader eyebrow={formatLongDate()} title="Overview." sub="Bookings, assignments and the catalogue at a glance." />
          {loadingOrError || (
            <>
              <Stats items={[
                { label: "Bookings",   value: safeB.length,       icon: "list",   tone: "blue"   },
                { label: "Pending",    value: pending.length,     icon: "clock",  tone: "amber"  },
                { label: "Completed",  value: completed.length,   icon: "check",  tone: "green"  },
                { label: "Unassigned", value: unassigned.length,  icon: "target", tone: "terra"  },
                { label: "Revenue (completed)", value: formatMoneyCompact(revenue), icon: "pound", tone: "teal" },
              ]} />
              {unassigned.length > 0 && (
                <Card i={1} tone="terra" className="db-row" >
                  <div className="db-row-main">
                    <h2 className="db-card-title">{unassigned.length} booking{unassigned.length > 1 ? "s" : ""} waiting for a phlebotomist</h2>
                    <p className="db-sub" style={{ marginTop: 0 }}>Patients see "Pending" until someone is assigned.</p>
                  </div>
                  <Button icon="target" onClick={() => setTab("assign")}>Assign now</Button>
                </Card>
              )}
              <SectionTitle>Recent bookings</SectionTitle>
              <DataTable caption="Most recent bookings" columns={bookingCols.filter((c) => c.key !== "act")} rows={safeB.slice(0, 8)}
                         empty={<EmptyState icon="list" title="No bookings yet">Bookings appear here as soon as patients make them.</EmptyState>} />
            </>
          )}
        </>
      )}

      {tab === "bookings" && (
        <>
          <PageHeader eyebrow="Bookings" title="All bookings." sub={status === "ready" ? `${safeB.length} booking${safeB.length === 1 ? "" : "s"}` : undefined} />
          {loadingOrError || <DataTable caption="All bookings" columns={bookingCols} rows={safeB}
                                        empty={<EmptyState icon="list" title="No bookings yet">Bookings appear here as soon as patients make them.</EmptyState>} />}
        </>
      )}

      {tab === "assign" && (
        <>
          <PageHeader eyebrow="Assign" title="Assign jobs." sub={status === "ready" ? `${unassigned.length} waiting` : undefined} />
          {loadingOrError || (unassigned.length === 0
            ? <EmptyState icon="check" title="Everything is assigned">New bookings that need a phlebotomist will appear here.</EmptyState>
            : <div className="db-stack">
                {unassigned.map((b, i) => (
                  <Card key={b._id} i={i} tone="amber">
                    <div className="db-row" data-booking={b.bookingId}>
                      <div className="db-row-main">
                        <h3 className="db-card-title">{patient(b)}</h3>
                        <div className="db-metas">
                          <Meta icon="tube">{testNames(b)}</Meta>
                          <Meta icon="calendar">{formatDate(b.appointmentDate)}</Meta>
                          <Meta icon="clock">{b.appointmentTime || "—"}</Meta>
                          <Meta icon="pin">{b.address || "—"}</Meta>
                          <Meta icon="phone">{b.user?.phone || "—"}</Meta>
                          <span className="db-code">#{b.bookingId || "—"}</span>
                        </div>
                      </div>
                      <div className="db-row-side"><Button icon="target" onClick={() => setAssignFor(b._id)}>Assign phlebotomist</Button></div>
                    </div>
                  </Card>
                ))}
              </div>)}
        </>
      )}

      {tab === "tests" && (
        <>
          <PageHeader eyebrow="Catalogue" title="Test catalogue." sub={`${testTypes.length} test type${testTypes.length === 1 ? "" : "s"}`}
                      actions={<Button icon="plus" onClick={() => setTestModal(true)}>Add test</Button>} />
          {loadingOrError || <DataTable caption="Test catalogue" rows={testTypes}
            empty={<EmptyState icon="tube" title="No tests in the catalogue" action={<Button icon="plus" onClick={() => setTestModal(true)}>Add the first test</Button>}>Patients can only book tests listed here.</EmptyState>}
            columns={[
              { key: "name", header: "Test", render: (t) => <><span className="db-cell-strong">{t.name || "—"}</span>{t.preparation && <span className="db-cell-sub">{t.preparation}</span>}</> },
              { key: "code", header: "Code", render: (t) => <span className="db-code">{t.code || "—"}</span> },
              { key: "cat", header: "Category", render: (t) => <span className="db-tag">{t.category || "—"}</span> },
              { key: "price", header: "Price", render: (t) => formatMoney(t.price) },
              { key: "dur", header: "Turnaround", render: (t) => t.duration || "—" },
              { key: "on", header: "Active", render: (t) => (t.isActive ? <span className="db-pill tone-green"><span className="db-pill-dot" />Active</span> : <span className="db-pill tone-grey"><span className="db-pill-dot" />Off</span>) },
              { key: "act", header: "Actions", render: (t) => (
                <span className="db-cell-actions">
                  <Button size="sm" variant="ghost" onClick={() => { setEditTest({ name: t.name, code: t.code, price: t.price, duration: t.duration, category: t.category, preparation: t.preparation || "", description: t.description || "" }); setEditTestModal(t); }}>Edit</Button>
                  {t.isActive && <Button size="sm" variant="danger" onClick={() => ask("Deactivate this test?", `${t.name} will no longer be bookable.`, "Deactivate", () => call(() => api.delete(`/test-types/${t._id}`), "Test deactivated."))}>Deactivate</Button>}
                </span>
              ) },
            ]} />}
        </>
      )}

      {tab === "plans" && (
        <>
          <PageHeader eyebrow="Plans" title="Subscription plans." sub={`${plans.length} plan${plans.length === 1 ? "" : "s"}`}
                      actions={<Button icon="plus" onClick={() => setPlanModal(true)}>Add plan</Button>} />
          {loadingOrError || <DataTable caption="Subscription plans" rows={plans}
            empty={<EmptyState icon="repeat" title="No plans yet" action={<Button icon="plus" onClick={() => setPlanModal(true)}>Add a plan</Button>}>Plans let patients book repeat visits.</EmptyState>}
            columns={[
              { key: "name", header: "Plan", render: (p) => <><span className="db-cell-strong">{p.name || "—"}</span>{p.description && <span className="db-cell-sub">{p.description}</span>}</> },
              { key: "tests", header: "Tests", render: (p) => p.testTypes?.map((t) => t.name).join(", ") || "—" },
              { key: "visits", header: "Visits", render: (p) => p.visitsPerCycle || "—" },
              { key: "cycle", header: "Cycle", render: (p) => (p.cycleLengthDays ? `${p.cycleLengthDays} days` : "—") },
              { key: "price", header: "Price", render: (p) => formatMoney(p.price) },
              { key: "on", header: "Active", render: (p) => (p.isActive ? <span className="db-pill tone-green"><span className="db-pill-dot" />Active</span> : <span className="db-pill tone-grey"><span className="db-pill-dot" />Off</span>) },
              { key: "act", header: "Actions", render: (p) => (
                <span className="db-cell-actions">
                  <Button size="sm" variant="ghost" onClick={() => { setEditPlan({ name: p.name, description: p.description || "", testTypeIds: p.testTypes?.map((t) => t._id) || [], visitsPerCycle: p.visitsPerCycle, cycleLengthDays: p.cycleLengthDays, price: p.price, isActive: p.isActive }); setEditPlanModal(p); }}>Edit</Button>
                  {p.isActive && <Button size="sm" variant="danger" onClick={() => ask("Deactivate this plan?", `${p.name} will no longer be offered to patients.`, "Deactivate", () => call(() => api.delete(`/plans/${p._id}`), "Plan deactivated."))}>Deactivate</Button>}
                </span>
              ) },
            ]} />}
        </>
      )}

      {tab === "subscriptions" && (
        <>
          <PageHeader eyebrow="Subscriptions" title="All subscriptions." sub={`${subscriptions.length} subscription${subscriptions.length === 1 ? "" : "s"}`} />
          {loadingOrError || (subscriptions.length === 0
            ? <EmptyState icon="calendar" title="No subscriptions yet">Patients' repeat-visit plans will appear here.</EmptyState>
            : <div className="db-stack">
                {subscriptions.map((s, i) => (
                  <Card key={s._id} i={i} tone={s.status === "active" ? "violet" : s.status === "paused" ? "amber" : "grey"}>
                    <div className="db-row">
                      <div className="db-row-main">
                        <h3 className="db-card-title">{s.plan?.name || "Plan"} · {s.user?.name || "Unknown"}</h3>
                        <div className="db-metas">
                          <Meta icon="mail">{s.user?.email || "—"}</Meta>
                          <Meta icon="phone">{s.user?.phone || "—"}</Meta>
                          <Meta icon="repeat">{s.cycleVisitsUsed}/{s.visitsPerCycle} visits this cycle</Meta>
                          <Meta icon="calendar">Next {formatDate(s.nextVisitDate)}</Meta>
                          <Meta icon="pound">{formatMoney(s.price)} per cycle</Meta>
                        </div>
                      </div>
                      <div className="db-row-side">
                        <span className={`db-pill tone-${s.status === "active" ? "violet" : s.status === "paused" ? "amber" : "grey"}`}><span className="db-pill-dot" />{s.status}</span>
                        <span className={`db-pill tone-${s.paymentStatus === "paid" ? "green" : "amber"}`}><span className="db-pill-dot" />{s.paymentStatus}</span>
                        {s.paymentStatus !== "paid" && <Button size="sm" variant="soft" onClick={() => markSubPaid(s._id)}>Mark paid</Button>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>)}
        </>
      )}

      {tab === "phlebotomists" && (
        <>
          <PageHeader eyebrow="Team" title="Phlebotomists." sub={`${phlebotomists.length} team member${phlebotomists.length === 1 ? "" : "s"}`}
                      actions={<Button icon="plus" onClick={() => setPhleModal(true)}>Add phlebotomist</Button>} />
          {loadingOrError || (phlebotomists.length === 0
            ? <EmptyState icon="users" title="No phlebotomists yet" action={<Button icon="plus" onClick={() => setPhleModal(true)}>Add the first phlebotomist</Button>}>Bookings cannot be assigned until there is at least one.</EmptyState>
            : <div className="db-stack">
                {phlebotomists.map((p, i) => (
                  <Card key={p._id} i={i} tone="blue">
                    <div className="db-row">
                      <div className="db-row-main">
                        <h3 className="db-card-title">{p.name || "—"}</h3>
                        <div className="db-metas">
                          <Meta icon="mail">{p.email || "—"}</Meta>
                          <Meta icon="phone">{p.phone || "—"}</Meta>
                          <Meta icon="pin">{p.serviceArea || "—"}</Meta>
                          <span className="db-code">Licence {p.licenseNumber || "—"}</span>
                          <Meta icon="user">{formatRatingSummary(p)}</Meta>
                        </div>
                      </div>
                      <div className="db-row-side">
                        <span className={`db-pill tone-${p.isAvailable ? "green" : "grey"}`}><span className="db-pill-dot" />{p.isAvailable ? "Online" : "Offline"}</span>
                        <span className="db-cell-actions">
                          <Button size="sm" variant="ghost" onClick={() => { setEditPhle({ name: p.name, phone: p.phone, serviceArea: p.serviceArea || "", licenseNumber: p.licenseNumber || "" }); setEditPhleModal(p); }}>Edit</Button>
                          <Button size="sm" variant="danger" onClick={() => ask("Deactivate this phlebotomist?", `${p.name} will no longer be able to sign in or be assigned.`, "Deactivate", () => call(() => api.delete(`/phlebotomists/${p._id}`), "Phlebotomist deactivated."))}>Deactivate</Button>
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>)}
        </>
      )}

      {tab === "analytics" && (
        <>
          <PageHeader eyebrow="Numbers" title="Analytics." sub="Computed from the bookings in this system. Prices are whatever the catalogue holds." />
          {loadingOrError || (
            <>
              <Stats items={[
                { label: "Revenue (completed)", value: formatMoney(revenue), icon: "pound", tone: "teal" },
                { label: "Bookings", value: safeB.length, icon: "list", tone: "blue" },
                { label: "Completion rate", value: safeB.length ? `${Math.round((completed.length / safeB.length) * 100)}%` : "—", icon: "check", tone: "green" },
                { label: "Average completed booking", value: completed.length ? formatMoney(revenue / completed.length) : "—", icon: "chart", tone: "violet" },
              ]} />
              <div className="db-options" style={{ marginTop: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                {[{ title: "Bookings by status", items: statusCounts }, { title: "Most booked tests", items: testCounts.map((t) => ({ ...t, tone: "teal" })) }].map((sec, si) => (
                  <Card key={sec.title} i={si}>
                    <h2 className="db-card-title">{sec.title}</h2>
                    {sec.items.length === 0 ? <p className="db-fineprint">No data yet.</p> : (
                      <div className="db-bars">
                        {sec.items.map((it) => {
                          const total = sec.items.reduce((s, x) => s + x.count, 0) || 1;
                          const pct = Math.round((it.count / total) * 100);
                          return (
                            <div key={it.name} className={`db-bar-row tone-${it.tone || "teal"}`}>
                              <div className="db-bar-head"><span>{it.name}</span><span className="db-code">{it.count} · {pct}%</span></div>
                              <div className="db-bar-track" role="img" aria-label={`${it.name}: ${it.count} (${pct}%)`}>
                                <div className="db-bar-fill" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === "audit" && <EmailAuditLog />}

      {/* ── Modals ── */}
      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title="Assign a phlebotomist">
        {assignBooking && <p className="db-sub" style={{ marginTop: 0, marginBottom: 14 }}>{patient(assignBooking)} · {testNames(assignBooking)} · {formatDate(assignBooking.appointmentDate)}</p>}
        {phlebotomists.length === 0
          ? <EmptyState icon="users" title="No phlebotomists yet">Add one under Phlebotomists first.</EmptyState>
          : <div className="db-stack" role="list">
              {phlebotomists.map((p) => (
                <button key={p._id} type="button" role="listitem" className="db-option" onClick={() => assign(assignFor, p._id)}>
                  <span className="db-option-name">{p.name || "—"}</span>
                  <span className="db-metas">
                    <Meta icon="pin">{p.serviceArea || "—"}</Meta>
                    <Meta icon="user">{formatRating(p) ? `Rated ${formatRating(p)}` : "No reviews yet"}</Meta>
                  </span>
                  <span className={`db-pill tone-${p.isAvailable ? "green" : "grey"}`} style={{ width: "fit-content" }}><span className="db-pill-dot" />{p.isAvailable ? "Online" : "Offline"}</span>
                </button>
              ))}
            </div>}
      </Modal>

      <Modal open={testModal} onClose={() => setTestModal(false)} title="Add a test">
        {testForm(newTest, setNewTest, true)}
        <Button className="db-btn-block" onClick={createTest}>Add test</Button>
      </Modal>
      <Modal open={!!editTestModal} onClose={() => setEditTestModal(null)} title="Edit test">
        {testForm(editTest, setEditTest, false)}
        <div className="db-actions"><Button variant="ghost" onClick={() => setEditTestModal(null)}>Cancel</Button><Button onClick={saveEditTest}>Save changes</Button></div>
      </Modal>

      <Modal open={planModal} onClose={() => setPlanModal(false)} title="Add a subscription plan">
        {planForm(newPlan, setNewPlan)}
        <Button className="db-btn-block" onClick={createPlan}>Add plan</Button>
      </Modal>
      <Modal open={!!editPlanModal} onClose={() => setEditPlanModal(null)} title="Edit plan">
        {planForm(editPlan, setEditPlan)}
        <div className="db-actions"><Button variant="ghost" onClick={() => setEditPlanModal(null)}>Cancel</Button><Button onClick={saveEditPlan}>Save changes</Button></div>
      </Modal>

      <Modal open={phleModal} onClose={() => setPhleModal(false)} title="Add a phlebotomist">
        <Field label="Full name"><input autoComplete="off" value={newPhle.name} onChange={(e) => setNewPhle((p) => ({ ...p, name: e.target.value }))} /></Field>
        <Field label="Email"><input type="email" autoComplete="off" placeholder="name@example.com" value={newPhle.email} onChange={(e) => setNewPhle((p) => ({ ...p, email: e.target.value }))} /></Field>
        <Field label="Phone"><input type="tel" placeholder={locale.examplePhone} value={newPhle.phone} onChange={(e) => setNewPhle((p) => ({ ...p, phone: e.target.value }))} /></Field>
        <Field label="Temporary password" hint={`At least ${PASSWORD_MIN} characters, with a letter and a number.`}>
          <input type="password" autoComplete="new-password" value={newPhle.password} onChange={(e) => setNewPhle((p) => ({ ...p, password: e.target.value }))} />
        </Field>
        <div className="db-grid-2">
          <Field label="Service area"><input placeholder="e.g. CF10" value={newPhle.serviceArea} onChange={(e) => setNewPhle((p) => ({ ...p, serviceArea: e.target.value }))} /></Field>
          <Field label="Licence number"><input value={newPhle.licenseNumber} onChange={(e) => setNewPhle((p) => ({ ...p, licenseNumber: e.target.value }))} /></Field>
        </div>
        <Button className="db-btn-block" onClick={createPhle}>Create account</Button>
      </Modal>
      <Modal open={!!editPhleModal} onClose={() => setEditPhleModal(null)} title="Edit phlebotomist">
        <Field label="Full name"><input value={editPhle.name || ""} onChange={(e) => setEditPhle((p) => ({ ...p, name: e.target.value }))} /></Field>
        <Field label="Phone"><input type="tel" value={editPhle.phone || ""} onChange={(e) => setEditPhle((p) => ({ ...p, phone: e.target.value }))} /></Field>
        <div className="db-grid-2">
          <Field label="Service area"><input value={editPhle.serviceArea || ""} onChange={(e) => setEditPhle((p) => ({ ...p, serviceArea: e.target.value }))} /></Field>
          <Field label="Licence number"><input value={editPhle.licenseNumber || ""} onChange={(e) => setEditPhle((p) => ({ ...p, licenseNumber: e.target.value }))} /></Field>
        </div>
        <div className="db-actions"><Button variant="ghost" onClick={() => setEditPhleModal(null)}>Cancel</Button><Button onClick={saveEditPhle}>Save changes</Button></div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title || ""}>
        <p className="db-sub" style={{ marginTop: 0 }}>{confirm?.body}</p>
        <div className="db-actions">
          <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="danger" icon="x" onClick={() => { const a = confirm.action; setConfirm(null); a(); }}>{confirm?.label}</Button>
        </div>
      </Modal>
    </Shell>
  );
}
