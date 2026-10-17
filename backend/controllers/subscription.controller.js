const Subscription = require("../models/Subscription");
const Plan          = require("../models/Plan");
const { isValidUkPostcode, POSTCODE_MESSAGE, isInServiceArea, outOfAreaMessage } = require("../utils/validators");

// POST /api/subscriptions — patient subscribes to a plan
exports.subscribe = async (req, res, next) => {
  try {
    const { planId, address, addressParts, appointmentTime } = req.body;
    if (!planId || !address) {
      return res.status(400).json({ success: false, message: "Plan and address are required." });
    }

    // Only enforced when a structured postcode is supplied, so existing
    // free-text addresses still work.
    if (addressParts?.postcode) {
      if (!isValidUkPostcode(addressParts.postcode)) {
        return res.status(400).json({ success: false, message: POSTCODE_MESSAGE });
      }
      if (!isInServiceArea(addressParts.postcode)) {
        return res.status(400).json({
          success:   false,
          outOfArea: true,
          message:   outOfAreaMessage(addressParts.postcode),
        });
      }
    }

    const plan = await Plan.findOne({ _id: planId, isActive: true });
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subscription = await Subscription.create({
      user: req.user._id,
      plan: plan._id,
      testTypes:       plan.testTypes,
      visitsPerCycle:  plan.visitsPerCycle,
      cycleLengthDays: plan.cycleLengthDays,
      price:           plan.price,
      address,
      addressParts,
      appointmentTime: appointmentTime || "09:00",
      startDate:      today,
      nextVisitDate:  today,
      cycleStartDate: today,
    });

    await subscription.populate([
      { path: "plan", select: "name price" },
      { path: "testTypes", select: "name code price" },
    ]);

    res.status(201).json({ success: true, subscription });
  } catch (err) { next(err); }
};

// GET /api/subscriptions/mine — patient's own subscriptions
exports.getMySubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id })
      .populate("plan", "name price")
      .populate("testTypes", "name code price")
      .sort({ createdAt: -1 });
    res.json({ success: true, subscriptions });
  } catch (err) { next(err); }
};

// GET /api/subscriptions — admin, all subscriptions
exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("user", "name email phone")
      .populate("plan", "name price")
      .sort({ createdAt: -1 });
    res.json({ success: true, subscriptions });
  } catch (err) { next(err); }
};

// Shared guard: patient can only touch their own subscription, admin can touch any
async function findOwnedSubscription(req) {
  const filter = { _id: req.params.id };
  if (req.user.role !== "admin") filter.user = req.user._id;
  return Subscription.findOne(filter);
}

// Pause only an active plan, resume only a paused one, cancel anything not
// already cancelled. "Resume" used to re-activate a cancelled plan, and the
// scheduler then went back to creating visits for it.
const conflict = (res, sub, verb) =>
  res.status(409).json({ success: false, message: `This subscription is ${sub.status} and cannot be ${verb}.` });

// PATCH /api/subscriptions/:id/pause
exports.pauseSubscription = async (req, res, next) => {
  try {
    const sub = await findOwnedSubscription(req);
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found." });
    if (sub.status !== "active") return conflict(res, sub, "paused");
    sub.status = "paused";
    await sub.save();
    res.json({ success: true, subscription: sub });
  } catch (err) { next(err); }
};

// PATCH /api/subscriptions/:id/resume
exports.resumeSubscription = async (req, res, next) => {
  try {
    const sub = await findOwnedSubscription(req);
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found." });
    if (sub.status !== "paused") return conflict(res, sub, "resumed");
    sub.status = "active";
    // If the paused visit date has already passed, push it to today so it's picked up on the next run.
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (sub.nextVisitDate < today) sub.nextVisitDate = today;
    await sub.save();
    res.json({ success: true, subscription: sub });
  } catch (err) { next(err); }
};

// PATCH /api/subscriptions/:id/cancel
exports.cancelSubscription = async (req, res, next) => {
  try {
    const sub = await findOwnedSubscription(req);
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found." });
    if (sub.status === "cancelled") return conflict(res, sub, "cancelled");
    sub.status = "cancelled";
    await sub.save();
    res.json({ success: true, subscription: sub });
  } catch (err) { next(err); }
};

// PATCH /api/subscriptions/:id/mark-paid — admin only
exports.markPaid = async (req, res, next) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: "paid" },
      { new: true }
    );
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found." });
    res.json({ success: true, subscription: sub });
  } catch (err) { next(err); }
};
