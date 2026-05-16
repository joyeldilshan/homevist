const express  = require("express");
const router   = express.Router();
const TestType = require("../models/TestType");
const { protect, authorize } = require("../middleware/auth.middleware");

// GET /api/test-types — public, used by booking form
router.get("/", async (req, res, next) => {
  try {
    const tests = await TestType.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, testTypes: tests });
  } catch (err) { next(err); }
});

// POST /api/test-types — admin only
router.post("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, price, duration, category, preparation, description } = req.body;
    if (!name || !code || !price) {
      return res.status(400).json({ success: false, message: "Name, code and price are required." });
    }
    const existing = await TestType.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "A test with this code already exists." });
    }
    const test = await TestType.create({
      name, code: code.toUpperCase(), price: Number(price),
      duration: duration || "24h", category: category || "haematology",
      preparation, description,
    });
    res.status(201).json({ success: true, test });
  } catch (err) { next(err); }
});

// PUT /api/test-types/:id — admin only
router.put("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const test = await TestType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!test) return res.status(404).json({ success: false, message: "Test not found." });
    res.json({ success: true, test });
  } catch (err) { next(err); }
});

// DELETE /api/test-types/:id — admin only (soft delete)
router.delete("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    await TestType.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Test deactivated." });
  } catch (err) { next(err); }
});

module.exports = router;