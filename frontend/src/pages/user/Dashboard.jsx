import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBookingSocket } from "../../hooks/useSocket";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { formatMoney, formatDate, formatLongDate } from "../../utils/format";
import { isValidUkPostcode, normaliseUkPostcode, isInServiceArea, outOfAreaMessage, POSTCODE_MESSAGE } from "../../utils/validators";
import locale from "../../config/locale";
import {
  Shell, PageHeader, SectionTitle, Stats, StatusPill, StageProgress, LoadingCards, EmptyState,
  ErrorState, Button, Field, Modal, Meta, Card, I,
} from "../../dashboard/kit";
import { BOOKING_STAGES, ACTIVE_BOOKING, testNames } from "../../dashboard/status";

/**
 * Patient dashboard. Data, API calls and the live booking socket are
 * unchanged from the previous version; the layout is the shared
 * dashboard shell (src/dashboard/kit.jsx).
 */

const NAV = [
  { id: "home",     label: "Home",          icon: "home"     },
  { id: "book",     label: "Book a test",   short: "Book",     icon: "calendar" },
  { id: "bookings", label: "My bookings",   short: "Bookings", icon: "list"     },
  { id: "reports",  label: "My reports",    short: "Reports",  icon: "file"     },
  { id: "plans",    label: "Subscriptions", icon: "repeat"   },
  { id: "profile",  label: "Profile",       icon: "user"     },
];

const STEPS = ["Tests", "Date & time", "Address", "Confirm"];
const today = () => new Date().toISOString().split("T")[0];

export default function UserDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tab,        setTab]        = useState("home");
  const [bookings,   setBookings]   = useState([]);
  const [reports,    setReports]    = useState([]);
  const [tests,      setTests]      = useState([]);
  const [status,     setStatus]     = useState("loading");   // loading | ready | error
  const [loadError,  setLoadError]  = useState("");
  const [booking,    setBooking]    = useState(false);
  const [openTrack,  setOpenTrack]  = useState(null);
  const [flashIds,   setFlashIds]   = useState(new Set());
  const [cancelId,   setCancelId]   = useState(null);

  const [step,   setStep]   = useState(0);
  const [picked, setPicked] = useState([]);
  const [form,   setForm]   = useState({
    date: "", time: "09:00", notes: "",
    // Structured UK address, prefilled from the profile, falling back to
    // the legacy free-text address for older accounts.
    line1:    user?.addressParts?.line1    || "",
    line2:    user?.addressParts?.line2    || "",
    city:     user?.addressParts?.city     || "",
    county:   user?.addressParts?.county   || "",
    postcode: user?.addressParts?.postcode || "",
    legacyAddress: user?.address || "",
  });
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // The API takes a single `address` string, so compose one from the parts.
  const composedAddress = () =>
    [form.line1, form.line2, form.city, form.county, form.postcode].filter(Boolean).join(", ") || form.legacyAddress;
  const addressReady = () =>
    !!form.line1 && !!form.city && isValidUkPostcode(form.postcode) && isInServiceArea(form.postcode);

  const [plans,         setPlans]         = useState([]);
  const [mySubs,        setMySubs]        = useState([]);
  const [subscribingId, setSubscribingId] = useState(null);
  const [subForm,       setSubForm]       = useState({ address: user?.address || "", postcode: user?.addressParts?.postcode || "", appointmentTime: "09:00" });
  const [subLoading,    setSubLoading]    = useState(false);

  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "", age: user?.age || "", address: user?.address || "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/bookings");
      setBookings(r.data.bookings || []);
      setLoadError("");
      setStatus("ready");
    } catch (e) {
      setLoadError(e?.response?.data?.message || "We could not load your bookings.");
      setStatus("error");
    }
    try {
      const rep = await api.get("/reports");
      setReports(rep.data.reports || []);
    } catch { /* bookings still show; reports tab shows its own empty state */ }
  }, []);

  const loadSubs = async () => {
    try {
      const r = await api.get("/subscriptions/mine");
      setMySubs(r.data.subscriptions || []);
    } catch { /* shown as "no subscriptions" */ }
  };

  useEffect(() => {
    load();
    if (tab === "book")  api.get("/test-types").then((r) => setTests(r.data.testTypes || [])).catch(() => {});
    if (tab === "plans") { api.get("/plans").then((r) => setPlans(r.data.plans || [])).catch(() => {}); loadSubs(); }
  }, [tab, load]);

  // Live updates: the server emits "status_update" to each booking's room.
  const bookingIds = bookings.map((b) => b.bookingId).filter(Boolean);
  useBookingSocket(bookingIds, ({ bookingId, status: s }) => {
    const info = BOOKING_STAGES.find((x) => x.key === s);
    toast.success(`Booking ${bookingId}: ${info?.label || s}`);
    setFlashIds((p) => new Set([...p, bookingId]));
    setTimeout(() => setFlashIds((p) => { const n = new Set(p); n.delete(bookingId); return n; }), 4000);
    load();
  });

  const reportFor = (b) => reports.find((r) => r.booking?._id === b._id || r.booking?.bookingId === b.bookingId);
  const openReport = (b) => {
    const rep = reportFor(b);
    if (rep?.fileUrl) window.open(rep.fileUrl, "_blank", "noopener,noreferrer");
    else { toast("Your report isn't ready yet."); setTab("reports"); }
  };

  const toggleTest = (t) => setPicked((p) => (p.find((x) => x._id === t._id) ? p.filter((x) => x._id !== t._id) : [...p, t]));
  const totalAmount = picked.reduce((s, t) => s + (t.price || 0), 0);

  const handleBook = async () => {
    if (!picked.length || !form.date) { toast.error("Select at least one test and choose a date."); return; }
    if (!addressReady()) { toast.error("Enter your address and a postcode we cover."); return; }
    setBooking(true);
    try {
      await api.post("/bookings", {
        testTypeIds: picked.map((t) => t._id),
        appointmentDate: form.date,
        appointmentTime: form.time,
        address: composedAddress(),
        addressParts: {
          line1: form.line1, line2: form.line2, city: form.city, county: form.county,
          postcode: normaliseUkPostcode(form.postcode) || form.postcode,
        },
        notes: form.notes,
      });
      toast.success(`Booking placed: ${picked.length} test${picked.length > 1 ? "s" : ""}.`);
      setStep(0); setPicked([]); setTab("bookings"); load();
    } catch (e) { toast.error(e.response?.data?.message || "Booking failed."); }
    finally { setBooking(false); }
  };

  const confirmCancel = async () => {
    try {
      await api.patch(`/bookings/${cancelId}/status`, { status: "cancelled" });
      toast.success("Booking cancelled."); load();
    } catch { toast.error("Could not cancel."); }
    finally { setCancelId(null); }
  };

  const handleSubscribe = async (planId) => {
    if (!subForm.address) { toast.error("Enter your address."); return; }
    if (!isValidUkPostcode(subForm.postcode)) { toast.error(POSTCODE_MESSAGE); return; }
    if (!isInServiceArea(subForm.postcode)) { toast.error(outOfAreaMessage(subForm.postcode)); return; }
    setSubLoading(true);
    try {
      await api.post("/subscriptions", {
        planId, address: subForm.address,
        addressParts: { postcode: normaliseUkPostcode(subForm.postcode) || subForm.postcode },
        appointmentTime: subForm.appointmentTime,
      });
      toast.success("Subscribed. Your first visit will be scheduled.");
      setSubscribingId(null); loadSubs();
    } catch (e) { toast.error(e.response?.data?.message || "Subscription failed."); }
    finally { setSubLoading(false); }
  };

  const SUB_DONE = { pause: "paused", resume: "resumed", cancel: "cancelled" };
  const handleSubAction = async (id, action) => {
    try { await api.patch(`/subscriptions/${id}/${action}`); toast.success(`Subscription ${SUB_DONE[action]}.`); loadSubs(); }
    catch { toast.error("Could not update subscription."); }
  };

  // The profile form used to have no save handler at all.
  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const body = { name: profile.name.trim(), phone: profile.phone.trim(), address: profile.address.trim() };
      if (profile.age !== "") body.age = Number(profile.age);
      const r = await api.put("/auth/update-profile", body);
      updateUser(r.data.user || body);
      toast.success("Profile saved.");
    } catch (err) { toast.error(err.response?.data?.message || "Could not save your profile."); }
    finally { setSavingProfile(false); }
  };

  const upcoming  = bookings.filter((b) => ACTIVE_BOOKING.includes(b.status));
  const completed = bookings.filter((b) => b.status === "completed");
  const nav = NAV.map((n) => ({
    ...n,
    badge: n.id === "bookings" ? upcoming.length : n.id === "reports" ? reports.length : 0,
  }));
  const go = (id) => { setTab(id); setStep(0); };
  const signOut = () => { logout(); navigate("/login"); };

  /* ── Booking card ── */
  const BookingCard = (b, i) => {
    const tracking = openTrack === b._id;
    const tone = { pending: "amber", confirmed: "blue", sample_collected: "violet", processing: "terra", completed: "green", rejected: "red" }[b.status] || "grey";
    return (
      <Card key={b._id} i={i} tone={tone} className={flashIds.has(b.bookingId) ? "is-flash" : ""}>
        <div className="db-row" data-booking={b.bookingId}>
          <div className="db-row-main">
            <h3 className="db-card-title">{testNames(b)}</h3>
            <div className="db-metas">
              <Meta icon="calendar">{formatDate(b.appointmentDate)}</Meta>
              <Meta icon="clock">{b.appointmentTime || "—"}</Meta>
              {b.phlebotomist && <Meta icon="user">{b.phlebotomist.name}</Meta>}
              <Meta icon="pound">{formatMoney(b.amount)}</Meta>
              <span className="db-code">#{b.bookingId || "—"}</span>
            </div>
            <StageProgress status={b.status} />
          </div>
          <div className="db-row-side">
            <StatusPill status={b.status} />
          </div>
        </div>
        <div className="db-actions">
          {b.status === "completed" && <Button size="sm" icon="download" onClick={() => openReport(b)}>Download report</Button>}
          {!["cancelled", "rejected"].includes(b.status) && (
            <Button size="sm" variant="ghost" icon="pulse" aria-expanded={tracking} onClick={() => setOpenTrack(tracking ? null : b._id)}>
              {tracking ? "Hide progress" : "Track progress"}
            </Button>
          )}
          {["pending", "confirmed"].includes(b.status) && <Button size="sm" variant="danger" onClick={() => setCancelId(b._id)}>Cancel booking</Button>}
        </div>
        {tracking && (
          <>
            <hr className="db-divider" />
            <StageProgress status={b.status} full />
          </>
        )}
      </Card>
    );
  };

  const firstName = user?.name?.split(" ")[0] || "there";
  const loadingOrError = status === "loading"
    ? <LoadingCards count={3} label="Loading your bookings" />
    : status === "error" ? <ErrorState message={loadError} onRetry={load} /> : null;

  return (
    <Shell role="Patient" items={nav} active={tab} onNavigate={go} user={user} onSignOut={signOut} live={bookingIds.length > 0}>
      {tab === "home" && (
        <>
          <PageHeader eyebrow={formatLongDate()} title={`Hello, ${firstName}.`} sub="Your bookings and reports, in one place."
                      actions={<Button icon="plus" onClick={() => go("book")}>Book a test</Button>} />
          {loadingOrError || (
            <>
              <Stats items={[
                { label: "Total bookings", value: bookings.length,  icon: "list",  tone: "blue"  },
                { label: "In progress",    value: upcoming.length,  icon: "pulse", tone: "amber" },
                { label: "Reports ready",  value: completed.length, icon: "file",  tone: "green" },
              ]} />
              <SectionTitle>Upcoming</SectionTitle>
              {upcoming.length
                ? <div className="db-stack">{upcoming.map(BookingCard)}</div>
                : <EmptyState icon="calendar" title={bookings.length ? "Nothing in progress" : "No bookings yet"}
                              action={<Button icon="plus" onClick={() => go("book")}>Book your first test</Button>}>
                    {bookings.length ? "Your completed bookings are under My bookings." : "Choose your tests and a time, and a phlebotomist comes to you."}
                  </EmptyState>}
            </>
          )}
        </>
      )}

      {tab === "book" && (
        <>
          <PageHeader eyebrow="New booking" title="Book tests." sub="Choose one or more tests for a single home visit." />
          <ol className="db-steps" aria-label="Booking steps">
            {STEPS.map((s, i) => (
              <li key={s} className={`db-step ${i < step ? "is-done" : i === step ? "is-current" : ""}`} aria-current={i === step ? "step" : undefined}>
                <span className="db-step-n">{i < step ? <I.check size={14} /> : i + 1}</span>{s}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <>
              {picked.length > 0 && (
                <Card className="db-row" i={0}>
                  <span className="db-meta"><strong>{picked.length} selected</strong>&nbsp;· {picked.map((t) => t.name).join(", ")}</span>
                  <strong className="db-option-price">{formatMoney(totalAmount)}</strong>
                </Card>
              )}
              <div className="db-options" style={{ margin: "14px 0 22px" }}>
                {tests.length === 0
                  ? <LoadingCards count={3} label="Loading tests" />
                  : tests.map((t) => {
                      const on = !!picked.find((x) => x._id === t._id);
                      return (
                        <button key={t._id} type="button" className="db-option" aria-pressed={on} onClick={() => toggleTest(t)}>
                          <span className="db-option-check" aria-hidden="true">{on && <I.check size={14} />}</span>
                          <span className="db-tag">{t.category}</span>
                          <span className="db-option-name">{t.name}</span>
                          <span className="db-meta"><I.clock size={15} />Results in {t.duration || "—"}</span>
                          {t.preparation && <span className="db-meta"><I.alert size={15} />{t.preparation}</span>}
                          <span className="db-option-price">{formatMoney(t.price)}</span>
                        </button>
                      );
                    })}
              </div>
              <Button size="lg" onClick={() => (picked.length ? setStep(1) : toast.error("Select at least one test."))}>
                Continue{picked.length > 0 && ` · ${formatMoney(totalAmount)}`}
              </Button>
            </>
          )}

          {step === 1 && (
            <Card i={0} className="db-form-card" >
              <div className="db-grid-2">
                <Field label="Appointment date"><input type="date" value={form.date} min={today()} onChange={(e) => setF("date", e.target.value)} /></Field>
                <Field label="Preferred time"><input type="time" value={form.time} onChange={(e) => setF("time", e.target.value)} /></Field>
              </div>
              <div className="db-actions">
                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={() => (form.date ? setStep(2) : toast.error("Select a date."))}>Continue</Button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card i={0}>
              <Field label="Address line 1"><input autoComplete="address-line1" placeholder="12 Example Street" value={form.line1} onChange={(e) => setF("line1", e.target.value)} /></Field>
              <Field label="Address line 2 (optional)"><input autoComplete="address-line2" placeholder="Flat 3" value={form.line2} onChange={(e) => setF("line2", e.target.value)} /></Field>
              <div className="db-grid-2">
                <Field label="Town or city"><input autoComplete="address-level2" placeholder="Cardiff" value={form.city} onChange={(e) => setF("city", e.target.value)} /></Field>
                <Field label="County (optional)"><input placeholder="South Glamorgan" value={form.county} onChange={(e) => setF("county", e.target.value)} /></Field>
              </div>
              <Field label="Postcode"
                     error={form.postcode && !isValidUkPostcode(form.postcode) ? POSTCODE_MESSAGE
                          : form.postcode && !isInServiceArea(form.postcode) ? outOfAreaMessage(form.postcode) : undefined}
                     hint={form.postcode && isValidUkPostcode(form.postcode) && isInServiceArea(form.postcode) ? `We cover ${normaliseUkPostcode(form.postcode)}` : undefined}>
                <input autoComplete="postal-code" placeholder={locale.examplePostcode} value={form.postcode}
                       onChange={(e) => setF("postcode", e.target.value.toUpperCase())} style={{ textTransform: "uppercase" }} />
              </Field>
              <Field label="Notes for the phlebotomist (optional)"><input placeholder="Door code, floor number…" value={form.notes} onChange={(e) => setF("notes", e.target.value)} /></Field>
              <div className="db-actions">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => (addressReady() ? setStep(3) : toast.error("Enter your address and a postcode we cover."))}>Continue</Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card i={0}>
              <SectionTitle>Summary</SectionTitle>
              <dl className="db-summary">
                {picked.map((t) => (<div key={t._id}><dt>{t.name}</dt><dd>{formatMoney(t.price)}</dd></div>))}
                <div className="is-total"><dt>Total</dt><dd>{formatMoney(totalAmount)}</dd></div>
                <div><dt>Date</dt><dd>{formatDate(form.date)}</dd></div>
                <div><dt>Time</dt><dd>{form.time}</dd></div>
                <div><dt>Address</dt><dd>{composedAddress()}</dd></div>
              </dl>
              <div className="db-actions">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button size="lg" busy={booking} onClick={handleBook}>
                  {booking ? "Booking…" : `Confirm ${picked.length} test${picked.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === "bookings" && (
        <>
          <PageHeader eyebrow="Bookings" title="My bookings." sub={status === "ready" ? `${bookings.length} booking${bookings.length === 1 ? "" : "s"}` : undefined} />
          {loadingOrError || (bookings.length
            ? <div className="db-stack">{bookings.map(BookingCard)}</div>
            : <EmptyState icon="list" title="No bookings yet" action={<Button icon="plus" onClick={() => go("book")}>Book your first test</Button>}>
                When you book a test it appears here, and you can follow it stage by stage.
              </EmptyState>)}
        </>
      )}

      {tab === "reports" && (
        <>
          <PageHeader eyebrow="Reports" title="My reports." sub={`${reports.length} report${reports.length === 1 ? "" : "s"} available`} />
          {status === "loading" ? <LoadingCards count={2} label="Loading your reports" />
            : reports.length === 0
              ? <EmptyState icon="file" title="No reports yet">Your report appears here once the laboratory has finished your tests.</EmptyState>
              : <div className="db-stack">
                  {reports.map((rep, i) => (
                    <Card key={rep._id} i={i} tone="green">
                      <div className="db-row">
                        <div className="db-row-main">
                          <h3 className="db-card-title">{testNames(rep.sample)}</h3>
                          <div className="db-metas">
                            <span className="db-code">Report {rep.reportId}</span>
                            <span className="db-code">Booking {rep.booking?.bookingId || "—"}</span>
                            <Meta icon="calendar">Issued {formatDate(rep.sentAt)}</Meta>
                          </div>
                          {rep.labComments && <p className="db-note-box">{rep.labComments}</p>}
                        </div>
                        <div className="db-row-side">
                          <Button size="sm" icon="download" onClick={() => (rep.fileUrl ? window.open(rep.fileUrl, "_blank", "noopener,noreferrer") : toast.error("No file available."))}>
                            Download report
                          </Button>
                        </div>
                      </div>
                      <p className="db-fineprint" style={{ marginTop: 14 }}>This report is confidential. Ask your GP or another clinician to interpret the results.</p>
                    </Card>
                  ))}
                </div>}
        </>
      )}

      {tab === "plans" && (
        <>
          <PageHeader eyebrow="Subscriptions" title="Subscriptions." sub="Recurring home visits, scheduled automatically." />
          {mySubs.length > 0 && (
            <>
              <SectionTitle>My subscriptions</SectionTitle>
              <div className="db-stack">
                {mySubs.map((s, i) => (
                  <Card key={s._id} i={i} tone={s.status === "active" ? "violet" : s.status === "paused" ? "amber" : "grey"}>
                    <div className="db-row">
                      <div className="db-row-main">
                        <h3 className="db-card-title">{s.plan?.name || "Plan"}</h3>
                        <div className="db-metas">
                          <Meta icon="repeat">{s.cycleVisitsUsed}/{s.visitsPerCycle} visits this cycle</Meta>
                          <Meta icon="calendar">Next visit {formatDate(s.nextVisitDate)}</Meta>
                          <Meta icon="pin">{s.address}</Meta>
                          <Meta icon="clock">{s.appointmentTime}</Meta>
                          <Meta icon="pound">{formatMoney(s.price)} per cycle · {s.paymentStatus === "paid" ? "paid" : "payment pending"}</Meta>
                        </div>
                      </div>
                      <div className="db-row-side"><span className={`db-pill tone-${s.status === "active" ? "violet" : s.status === "paused" ? "amber" : "grey"}`}><span className="db-pill-dot" />{s.status}</span></div>
                    </div>
                    <div className="db-actions">
                      {s.status === "active" && <Button size="sm" variant="ghost" onClick={() => handleSubAction(s._id, "pause")}>Pause</Button>}
                      {s.status === "paused" && <Button size="sm" variant="soft" onClick={() => handleSubAction(s._id, "resume")}>Resume</Button>}
                      {["active", "paused"].includes(s.status) && <Button size="sm" variant="danger" onClick={() => handleSubAction(s._id, "cancel")}>Cancel</Button>}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
          <SectionTitle>Available plans</SectionTitle>
          {plans.length === 0
            ? <EmptyState icon="repeat" title="No plans available yet">Subscription plans set up by the clinic will appear here.</EmptyState>
            : <div className="db-options">
                {plans.map((p, i) => (
                  <Card key={p._id} i={i}>
                    <h3 className="db-card-title">{p.name}</h3>
                    {p.description && <p className="db-sub" style={{ marginTop: 0 }}>{p.description}</p>}
                    <div className="db-metas" style={{ margin: "10px 0 14px" }}>
                      <Meta icon="tube">{p.testTypes?.map((t) => t.name).join(", ") || "—"}</Meta>
                      <Meta icon="repeat">{p.visitsPerCycle} visits every {p.cycleLengthDays} days</Meta>
                    </div>
                    <p className="db-option-price" style={{ marginBottom: 14 }}>{formatMoney(p.price)} <span className="db-fineprint">per cycle</span></p>
                    {subscribingId === p._id ? (
                      <>
                        <Field label="Home address"><textarea rows={2} value={subForm.address} onChange={(e) => setSubForm((f) => ({ ...f, address: e.target.value }))} /></Field>
                        <Field label="Postcode" error={subForm.postcode && !isValidUkPostcode(subForm.postcode) ? POSTCODE_MESSAGE
                                                   : subForm.postcode && !isInServiceArea(subForm.postcode) ? outOfAreaMessage(subForm.postcode) : undefined}>
                          <input placeholder={locale.examplePostcode} value={subForm.postcode} style={{ textTransform: "uppercase" }}
                                 onChange={(e) => setSubForm((f) => ({ ...f, postcode: e.target.value.toUpperCase() }))} />
                        </Field>
                        <Field label="Preferred time"><input type="time" value={subForm.appointmentTime} onChange={(e) => setSubForm((f) => ({ ...f, appointmentTime: e.target.value }))} /></Field>
                        <div className="db-actions">
                          <Button size="sm" variant="ghost" onClick={() => setSubscribingId(null)}>Cancel</Button>
                          <Button size="sm" busy={subLoading} onClick={() => handleSubscribe(p._id)}>{subLoading ? "Subscribing…" : "Confirm subscription"}</Button>
                        </div>
                      </>
                    ) : <Button className="db-btn-block" onClick={() => setSubscribingId(p._id)}>Subscribe</Button>}
                  </Card>
                ))}
              </div>}
        </>
      )}

      {tab === "profile" && (
        <>
          <PageHeader eyebrow="Account" title="My profile." sub="Your contact details, used for visits and reports." />
          <Card i={0}>
            <form onSubmit={saveProfile} noValidate>
              <Field label="Full name"><input autoComplete="name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></Field>
              <Field label="Email" hint="Contact the clinic to change your sign-in email."><input type="email" value={user?.email || ""} readOnly /></Field>
              <div className="db-grid-2">
                <Field label="Phone number"><input type="tel" autoComplete="tel" placeholder={locale.examplePhone} value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></Field>
                <Field label="Age (optional)"><input type="number" min="0" max="120" value={profile.age} onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))} /></Field>
              </div>
              <Field label="Address"><input autoComplete="street-address" value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} /></Field>
              <Button type="submit" busy={savingProfile}>{savingProfile ? "Saving…" : "Save changes"}</Button>
            </form>
          </Card>
        </>
      )}

      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel this booking?">
        <p className="db-sub" style={{ marginTop: 0 }}>The visit will be cancelled. You can book again at any time.</p>
        <div className="db-actions">
          <Button variant="ghost" onClick={() => setCancelId(null)}>Keep booking</Button>
          <Button variant="danger" onClick={confirmCancel}>Cancel booking</Button>
        </div>
      </Modal>
    </Shell>
  );
}
