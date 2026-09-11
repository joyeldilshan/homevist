const express = require("express");
const router  = express.Router();
const {
  getPlans,
  getAllPlans,
  createPlan,
  updatePlan,
  deactivatePlan,
} = require("../controllers/plan.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.get("/",     getPlans);
router.get("/all",  protect, authorize("admin"), getAllPlans);
router.post("/",    protect, authorize("admin"), createPlan);
router.put("/:id",  protect, authorize("admin"), updatePlan);
router.delete("/:id", protect, authorize("admin"), deactivatePlan);

module.exports = router;
