const Plan     = require("../models/Plan");
const TestType = require("../models/TestType");

// GET /api/plans — public/patient, active plans only
exports.getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .populate("testTypes", "name code price duration")
      .sort({ createdAt: -1 });
    res.json({ success: true, plans });
  } catch (err) { next(err); }
};

// GET /api/plans/all — admin, includes inactive
exports.getAllPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find()
      .populate("testTypes", "name code price duration")
      .sort({ createdAt: -1 });
    res.json({ success: true, plans });
  } catch (err) { next(err); }
};

// POST /api/plans — admin only
exports.createPlan = async (req, res, next) => {
  try {
    const { name, description, testTypeIds, visitsPerCycle, cycleLengthDays, price } = req.body;
    if (!name || !testTypeIds?.length || !visitsPerCycle || !cycleLengthDays || !price) {
      return res.status(400).json({ success: false, message: "Name, tests, visits per cycle, cycle length and price are required." });
    }
    const testTypes = await TestType.find({ _id: { $in: testTypeIds }, isActive: true });
    if (testTypes.length === 0) {
      return res.status(404).json({ success: false, message: "No valid test types found." });
    }
    const plan = await Plan.create({
      name, description,
      testTypes: testTypes.map(t => t._id),
      visitsPerCycle: Number(visitsPerCycle),
      cycleLengthDays: Number(cycleLengthDays),
      price: Number(price),
    });
    res.status(201).json({ success: true, plan });
  } catch (err) { next(err); }
};

// PUT /api/plans/:id — admin only
exports.updatePlan = async (req, res, next) => {
  try {
    const { name, description, testTypeIds, visitsPerCycle, cycleLengthDays, price, isActive } = req.body;
    const update = { name, description, visitsPerCycle, cycleLengthDays, price, isActive };
    if (testTypeIds?.length) update.testTypes = testTypeIds;

    const plan = await Plan.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate("testTypes", "name code price duration");
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });
    res.json({ success: true, plan });
  } catch (err) { next(err); }
};

// DELETE /api/plans/:id — admin only (soft delete)
exports.deactivatePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive: false });
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });
    res.json({ success: true, message: "Plan deactivated." });
  } catch (err) { next(err); }
};
