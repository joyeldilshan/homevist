const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const Booking      = require("../models/Booking");
const { sendSMS }  = require("../utils/notify");
const { sendBookingEmails } = require("../utils/emailService");

// Generates the next Booking for every active subscription whose
// nextVisitDate has arrived, then advances it (and rolls the cycle
// over once visitsPerCycle is reached).
async function generateDueVisits(io) {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // include anything due today

  const due = await Subscription.find({ status: "active", nextVisitDate: { $lte: today } })
    .populate("user", "name email phone");

  for (const sub of due) {
    try {
      const booking = await Booking.create({
        user:            sub.user._id,
        subscription:    sub._id,
        testTypes:       sub.testTypes,
        testType:        sub.testTypes[0],
        appointmentDate: sub.nextVisitDate,
        appointmentTime: sub.appointmentTime,
        address:         sub.address,
        isHomeVisit:     true,
        amount:          0,
        paymentMethod:   "online",
        notes:           "Auto-generated from subscription plan",
        statusHistory: [{
          status: "pending",
          note:   "Auto-generated from an active subscription",
        }],
      });

      sub.bookings.push(booking._id);
      sub.cycleVisitsUsed += 1;

      const intervalDays = sub.cycleLengthDays / sub.visitsPerCycle;
      const next = new Date(sub.nextVisitDate);
      next.setDate(next.getDate() + intervalDays);
      sub.nextVisitDate = next;

      if (sub.cycleVisitsUsed >= sub.visitsPerCycle) {
        sub.cycleVisitsUsed = 0;
        sub.cycleStartDate  = new Date();
        sub.paymentStatus   = "pending"; // new cycle — admin needs to collect payment again
      }

      await sub.save();

      if (io) {
        io.to("admin_room").emit("new_booking", {
          bookingId: booking.bookingId,
          patient:   sub.user?.name,
          tests:     "Subscription visit",
          count:     sub.testTypes.length,
        });
      }
      if (sub.user?.phone) {
        await sendSMS(sub.user.phone,
          `Home Visit: Your subscription visit #${booking.bookingId} is scheduled for ${booking.appointmentDate.toDateString()} at ${booking.appointmentTime}.`);
      }
      if (sub.user) {
        sendBookingEmails(booking, sub.user).catch(err => console.error("📧 Subscription email error:", err.message));
      }
    } catch (err) {
      console.error(`Subscription scheduler failed for subscription ${sub._id}:`, err.message);
    }
  }

  return due.length;
}

// Runs once daily at 06:00 server time.
function startSubscriptionScheduler(io) {
  cron.schedule("0 6 * * *", async () => {
    try {
      const count = await generateDueVisits(io);
      if (count) console.log(`Subscription scheduler: generated ${count} visit(s).`);
    } catch (err) {
      console.error("Subscription scheduler run failed:", err.message);
    }
  });
  console.log("Subscription scheduler registered (daily 06:00).");
}

module.exports = { startSubscriptionScheduler, generateDueVisits };
