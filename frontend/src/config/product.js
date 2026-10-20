/**
 * Facts about the product that the marketing pages may state as numbers.
 *
 * Every value here is read off the code, not chosen for effect, and says
 * where it comes from. If the source changes, change it here. Do not add
 * anything that cannot be traced the same way: no patient counts, ratings,
 * turnaround promises or partner names.
 */
import locale from "./locale";

/*
 * The booking lifecycle shown to patients: the forward path through the
 * status enum in backend/models/Booking.js. "cancelled" and "rejected"
 * also exist but are exits, not stages.
 */
export const BOOKING_STAGES = [
  { key: "pending",          title: "Pending",          desc: "The booking is placed and waiting for a phlebotomist to be assigned." },
  { key: "confirmed",        title: "Confirmed",        desc: "A phlebotomist is assigned to the visit and the patient is notified." },
  { key: "sample_collected", title: "Sample collected", desc: "The home visit has happened and the sample is on its way to the laboratory." },
  { key: "processing",       title: "Processing",       desc: "The laboratory is analysing the sample and entering results." },
  { key: "completed",        title: "Report ready",     desc: "The report is generated with a barcode reference and emailed to the patient." },
];

/* The role enum in backend/models/User.js: user, phlebotomist, mlt, admin. */
export const ROLE_COUNT = 4;

/*
 * The test catalogue the app ships with: the six test types created by
 * backend/utils/seed.js (CBC, FBS, LIPID, THYROID, LFT, HBA1C). An admin
 * can change the live catalogue, so this is the starting catalogue.
 */
export const TEST_PANEL_COUNT = 6;

export const SERVICE_AREA = locale.serviceAreaPrefixes;
