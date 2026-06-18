// ============================================================================
//  SAVE THIS FILE TO:   backend/routes/labReport.routes.js
//  THIS IS THE EXPRESS ROUTER. It must start with "const express".
// ============================================================================
const express = require("express");
const router  = express.Router();
const { createReport, getReports, sendReport } = require("../controllers/labReport.controller");
const { protect, authorize } = require("../middleware/rbac");
const upload = require("../middleware/upload");

router.post("/", protect, authorize("mlt"), upload.single("report"), createReport);
router.get("/", protect, authorize("mlt", "patient", "user", "admin"), getReports);
router.patch("/:id/send", protect, authorize("mlt"), sendReport);

module.exports = router;