/**
 * Booking and sample states, in one place for every dashboard.
 *
 * Each dashboard used to carry its own STATUS_CONFIG with different
 * labels for the same state ("Sent to Lab" vs "Sample Collected" vs "At
 * Lab"). The keys mirror the enums in backend/models/Booking.js and
 * backend/models/Sample.js. `tone` picks the pill colours in
 * dashboard.css, which were chosen for AA contrast on their tint.
 */

export const BOOKING_STAGES = [
  { key: "pending",          label: "Pending",          desc: "Booking received. Waiting for a phlebotomist to be assigned." },
  { key: "confirmed",        label: "Confirmed",        desc: "A phlebotomist is assigned and will visit at the agreed time." },
  { key: "sample_collected", label: "Sample collected", desc: "The sample has been collected and is on its way to the laboratory." },
  { key: "processing",       label: "Processing",       desc: "The laboratory is analysing the sample." },
  { key: "completed",        label: "Report ready",     desc: "The report is ready to download." },
];

export const BOOKING_STATUS = {
  pending:          { label: "Pending",          tone: "amber"  },
  confirmed:        { label: "Confirmed",        tone: "blue"   },
  sample_collected: { label: "Sample collected", tone: "violet" },
  processing:       { label: "Processing",       tone: "terra"  },
  completed:        { label: "Report ready",     tone: "green"  },
  cancelled:        { label: "Cancelled",        tone: "grey"   },
  rejected:         { label: "Rejected",         tone: "red"    },
};

/** States that are still moving: their pill shows a live pulse. */
export const ACTIVE_BOOKING = ["pending", "confirmed", "sample_collected", "processing"];

export const SAMPLE_STATUS = {
  collected:   { label: "Collected",   tone: "blue"   },
  sent_to_lab: { label: "Sent to lab", tone: "blue"   },
  received:    { label: "Received",    tone: "violet" },
  processing:  { label: "Processing",  tone: "amber"  },
  completed:   { label: "Completed",   tone: "green"  },
};

export const stageIndex = (status) => BOOKING_STAGES.findIndex((s) => s.key === status);

/** "Full blood count, Lipid profile" from a booking or sample. */
export const testNames = (x) =>
  x?.testTypes?.length
    ? x.testTypes.map((t) => t?.name).filter(Boolean).join(", ")
    : (x?.testType?.name || "—");
