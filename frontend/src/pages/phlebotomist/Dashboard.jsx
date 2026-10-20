import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { formatMoney, formatDate, formatLongDate, formatRating } from "../../utils/format";
import {
  Shell, PageHeader, SectionTitle, Stats, StatusPill, StageProgress, LoadingCards, EmptyState,
  ErrorState, Button, Field, Modal, Meta, Card,
} from "../../dashboard/kit";
import { testNames } from "../../dashboard/status";

/**
 * Phlebotomist dashboard. Same API calls as before; the shared shell
 * replaces the page's own sidebar and styles.
 */

const NAV = [
  { id: "dashboard", label: "Today",   icon: "home"  },
  { id: "jobs",      label: "My jobs", icon: "list"  },
  { id: "history",   label: "History", icon: "check" },
  { id: "profile",   label: "Profile", icon: "user"  },
];

const TONE = { pending: "amber", confirmed: "blue", sample_collected: "violet", processing: "terra", completed: "green", rejected: "red" };

export default function PhleboDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tab,       setTab]       = useState("dashboard");
  const [bookings,  setBookings]  = useState([]);
  const [available, setAvailable] = useState(!!user?.isAvailable);
  const [savingAvail, setSavingAvail] = useState(false);
  const [sending,   setSending]   = useState(null);
  const [status,    setStatus]    = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [reject,    setReject]    = useState(null);

  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const r = await api.get("/bookings");
      setBookings(r.data.bookings || []);
      setLoadError(""); setStatus("ready");
    } catch (e) {
      setLoadError(e?.response?.data?.message || "We could not load your visits.");
      setStatus("error");
    }
  }, []);

  // One fetch per tab view (it used to fetch twice on mount).
  useEffect(() => { fetchBookings(); }, [tab, fetchBookings]);

  const updateStatus = async (id, next, note = "") => {
    try {
      await api.patch(`/bookings/${id}/status`, { status: next, note });
      toast.success(next === "confirmed" ? "Job accepted." : next === "rejected" ? "Job declined." : "Status updated.");
      fetchBookings();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to update."); }
  };

  // Creates the Sample record that puts the job in the lab's queue.
  // The backend is idempotent, so pressing it twice is safe.
  const sendToLab = async (bookingId) => {
    setSending(bookingId);
    try {
      const res = await api.post("/samples", { bookingId });
      toast.success(res.data?.message || "Sample recorded and sent to the lab.");
      fetchBookings();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to send to lab."); }
    finally { setSending(null); }
  };

  const toggleAvailability = async () => {
    const next = !available;
    setSavingAvail(true);
    try {
      await api.put("/auth/update-profile", { isAvailable: next });
      setAvailable(next);
      updateUser({ isAvailable: next });   // so a reload shows the saved state
      toast.success(next ? "You are now available for visits." : "You are now offline.");
    } catch { toast.error("Could not update availability."); }
    finally { setSavingAvail(false); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const r = await api.put("/auth/update-profile", { name: profile.name.trim(), phone: profile.phone.trim() });
      updateUser(r.data.user || profile);
      toast.success("Profile saved.");
    } catch (err) { toast.error(err.response?.data?.message || "Could not save your profile."); }
    finally { setSavingProfile(false); }
  };

  const active    = bookings.filter((b) => !["completed", "cancelled", "rejected"].includes(b.status));
  const completed = bookings.filter((b) => b.status === "completed");
  const live      = bookings.filter((b) => !["cancelled", "rejected"].includes(b.status));
  const nav = NAV.map((n) => ({ ...n, badge: n.id === "jobs" ? active.length : 0 }));
  const signOut = () => { logout(); navigate("/login"); };

  const availability = (
    <button type="button" className="db-switch" role="switch" aria-checked={available} onClick={toggleAvailability} disabled={savingAvail}>
      <span className="db-switch-label">
        <span style={{ fontWeight: 600 }}>Available for visits</span>
        <span className="db-switch-state">{available ? "Online" : "Offline"}</span>
      </span>
      <span className="db-switch-track" aria-hidden="true"><span className="db-switch-thumb" /></span>
    </button>
  );

  const JobCard = (b, i) => (
    <Card key={b._id} i={i} tone={TONE[b.status] || "grey"}>
      <div className="db-row" data-booking={b.bookingId}>
        <div className="db-row-main">
          <h3 className="db-card-title">{b.user?.name || "Patient"}</h3>
          <div className="db-metas">
            <Meta icon="tube">{testNames(b)}</Meta>
            <Meta icon="calendar">{formatDate(b.appointmentDate)}</Meta>
            <Meta icon="clock">{b.appointmentTime || "—"}</Meta>
            <Meta icon="pin">{b.address || "—"}</Meta>
            <Meta icon="phone">{b.user?.phone || "—"}</Meta>
            <span className="db-code">#{b.bookingId || "—"}</span>
          </div>
          <StageProgress status={b.status} />
        </div>
        <div className="db-row-side"><StatusPill status={b.status} /></div>
      </div>
      <div className="db-actions">
        {b.status === "pending" && (
          <>
            <Button size="sm" icon="check" onClick={() => updateStatus(b._id, "confirmed", "Accepted by phlebotomist")}>Accept job</Button>
            <Button size="sm" variant="danger" onClick={() => setReject(b)}>Decline</Button>
          </>
        )}
        {/* On confirmed AND sample_collected: also rescues a booking left
            at sample_collected without a Sample record. */}
        {(b.status === "confirmed" || b.status === "sample_collected") && (
          <Button size="sm" icon="flask" busy={sending === b._id} onClick={() => sendToLab(b._id)}>
            {sending === b._id ? "Sending…" : b.status === "confirmed" ? "Sample collected · send to lab" : "Resend to lab"}
          </Button>
        )}
        {b.status === "processing" && <span className="db-meta">The laboratory is processing this sample.</span>}
        {b.status === "completed" && <span className="db-meta">Report delivered to the patient.</span>}
      </div>
    </Card>
  );

  const loadingOrError = status === "loading" ? <LoadingCards count={3} label="Loading your visits" />
    : status === "error" ? <ErrorState message={loadError} onRetry={fetchBookings} /> : null;
  const rating = formatRating(user);

  return (
    <Shell role="Phlebotomist" items={nav} active={tab} onNavigate={setTab} user={user} onSignOut={signOut} sideExtra={availability}>
      {tab === "dashboard" && (
        <>
          <PageHeader eyebrow={formatLongDate()} title={`Welcome, ${user?.name?.split(" ")[0] || "there"}.`} sub="Your assigned home visits." />
          {loadingOrError || (
            <>
              <Stats items={[
                { label: "Assigned jobs", value: bookings.length,  icon: "list",  tone: "blue"  },
                { label: "Active",        value: active.length,    icon: "pulse", tone: "amber" },
                { label: "Completed",     value: completed.length, icon: "check", tone: "green" },
                { label: rating ? `Average rating · ${user.totalRatings} review${user.totalRatings === 1 ? "" : "s"}` : "Rating · No reviews yet",
                  value: rating || "—", icon: "user", tone: "violet" },
              ]} />
              <SectionTitle>Upcoming and active</SectionTitle>
              {active.length
                ? <div className="db-stack">{active.map(JobCard)}</div>
                : <EmptyState icon="calendar" title="No active jobs right now"
                              action={!available && <Button variant="soft" onClick={toggleAvailability}>Go online</Button>}>
                    {available ? "New visits appear here as soon as the clinic assigns them." : "You are offline. Go online to be assigned visits."}
                  </EmptyState>}
            </>
          )}
        </>
      )}

      {tab === "jobs" && (
        <>
          <PageHeader eyebrow="Jobs" title="My jobs." sub={status === "ready" ? `${live.length} job${live.length === 1 ? "" : "s"}` : undefined} />
          {loadingOrError || (live.length
            ? <div className="db-stack">{live.map(JobCard)}</div>
            : <EmptyState icon="list" title="No jobs assigned yet">Jobs the clinic assigns to you appear here.</EmptyState>)}
        </>
      )}

      {tab === "history" && (
        <>
          <PageHeader eyebrow="History" title="Completed jobs." sub={status === "ready" ? `${completed.length} completed` : undefined} />
          {loadingOrError || (completed.length
            ? <div className="db-stack">
                {completed.map((b, i) => (
                  <Card key={b._id} i={i} tone="green">
                    <div className="db-row">
                      <div className="db-row-main">
                        <h3 className="db-card-title">{b.user?.name || "—"}</h3>
                        <div className="db-metas">
                          <Meta icon="tube">{testNames(b)}</Meta>
                          <Meta icon="calendar">{formatDate(b.appointmentDate)}</Meta>
                          <Meta icon="pound">{formatMoney(b.amount)}</Meta>
                        </div>
                      </div>
                      <div className="db-row-side"><StatusPill status="completed" /></div>
                    </div>
                  </Card>
                ))}
              </div>
            : <EmptyState icon="check" title="No completed jobs yet">Jobs move here once the patient's report has been delivered.</EmptyState>)}
        </>
      )}

      {tab === "profile" && (
        <>
          <PageHeader eyebrow="Account" title="My profile." sub="Contact details the clinic and patients see." />
          <Card i={0} className="db-profile-card">
            {availability}
            <hr className="db-divider" />
            <form onSubmit={saveProfile} noValidate>
              <Field label="Full name"><input autoComplete="name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></Field>
              <Field label="Email" hint="Ask an administrator to change your sign-in email."><input type="email" value={user?.email || ""} readOnly /></Field>
              <Field label="Phone"><input type="tel" autoComplete="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></Field>
              <div className="db-grid-2">
                <Field label="Service area" hint="Set by an administrator."><input value={user?.serviceArea || "—"} readOnly /></Field>
                <Field label="Licence number" hint="Set by an administrator."><input value={user?.licenseNumber || "—"} readOnly /></Field>
              </div>
              <Button type="submit" busy={savingProfile}>{savingProfile ? "Saving…" : "Save changes"}</Button>
            </form>
          </Card>
        </>
      )}

      <Modal open={!!reject} onClose={() => setReject(null)} title="Decline this job?">
        <p className="db-sub" style={{ marginTop: 0 }}>The booking for {reject?.user?.name || "this patient"} will be marked as rejected.</p>
        <div className="db-actions">
          <Button variant="ghost" onClick={() => setReject(null)}>Keep job</Button>
          <Button variant="danger" onClick={() => { updateStatus(reject._id, "rejected", "Rejected by phlebotomist"); setReject(null); }}>Decline job</Button>
        </div>
      </Modal>
    </Shell>
  );
}
