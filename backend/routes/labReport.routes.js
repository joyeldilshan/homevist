// ============================================================================
//  SAVE THIS FILE TO:   backend/routes/labReport.routes.js
//  THIS IS THE EXPRESS ROUTER. It must start with "const express".
// ============================================================================
const express = require("express");
const router  = express.Router();
const { createReport, getReports, sendReport, downloadReport } = require("../controllers/labReport.controller");
const { protect, authorize } = require("../middleware/rbac");
const { singleReport } = require("../middleware/upload");

router.post("/", protect, authorize("mlt"), singleReport, createReport);
router.get("/", protect, authorize("mlt", "patient", "user", "admin"), getReports);
// The only way to fetch a report PDF; checks the caller against the record.
router.get("/:id/file", protect, authorize("mlt", "patient", "user", "admin"), downloadReport);
router.patch("/:id/send", protect, authorize("mlt"), sendReport);

module.exports = router;