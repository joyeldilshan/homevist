const express = require("express");
const router  = express.Router();
const { sendToLab, getSamples, updateSampleStatus } = require("../controllers/sample.controller");
const { protect, authorize } = require("../middleware/rbac");

// Phlebotomist sends a sample to the lab
router.post("/", protect, authorize("phlebotomist"), sendToLab);

// MLT + phlebotomist can list samples (filtered inside controller)
router.get("/", protect, authorize("mlt", "phlebotomist", "admin"), getSamples);

// Only MLT updates lab status
router.patch("/:id/status", protect, authorize("mlt"), updateSampleStatus);

module.exports = router;