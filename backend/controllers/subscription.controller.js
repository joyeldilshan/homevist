const Subscription = require("../models/Subscription");
const Plan          = require("../models/Plan");

// POST /api/subscriptions — patient subscribes to a plan
exports.subscribe = async (req, res, next) => {
  try {
    const { planId, address, addressParts, appointmentTime } = req.body;
    if (!planId || !address) {
      return res.status(400).json({ success: false, message: "Plan and address are required." });
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

// PATCH /api/subscriptions/:id/pause
exports.pauseSubscription = async (req, res, next) => {
  try {
    const sub = await findOwnedSubscription(req);
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found." });
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
