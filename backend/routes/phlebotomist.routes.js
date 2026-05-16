const express  = require("express");
const router   = express.Router();
const User     = require("../models/User");
const { protect, authorize } = require("../middleware/auth.middleware");

// GET /api/phlebotomists — admin gets all phlebotomists
router.get("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const phlebotomists = await User.find({ role:"phlebotomist", isActive:true })
      .select("name email phone serviceArea licenseNumber rating totalRatings isAvailable createdAt");
    res.json({ success:true, phlebotomists });
  } catch (err) { next(err); }
});

// POST /api/phlebotomists — admin creates a new phlebotomist account
router.post("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { name, email, phone, password, serviceArea, licenseNumber } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success:false, message:"Name, email, phone and password are required." });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success:false, message:"Email already registered." });
    }
    const phlebo = await User.create({
      name, email, phone, password,
      role:          "phlebotomist",
      serviceArea:   serviceArea   || "",
      licenseNumber: licenseNumber || "",
      isAvailable:   false,
      isActive:      true,
      isVerified:    true,
    });
    res.status(201).json({ success:true, phlebotomist: phlebo });
  } catch (err) { next(err); }
});

// PATCH /api/phlebotomists/:id — admin updates phlebotomist
router.patch("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const allowed = ["name","phone","serviceArea","licenseNumber","isActive","isAvailable"];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const phlebo = await User.findByIdAndUpdate(req.params.id, updates, { new:true });
    if (!phlebo) return res.status(404).json({ success:false, message:"Phlebotomist not found." });
    res.json({ success:true, phlebotomist: phlebo });
  } catch (err) { next(err); }
});

// DELETE /api/phlebotomists/:id — admin deactivates phlebotomist
router.delete("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive:false });
    res.json({ success:true, message:"Phlebotomist deactivated." });
  } catch (err) { next(err); }
});

module.exports = router;