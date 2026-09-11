const express = require("express");
const router  = express.Router();
const {
  subscribe,
  getMySubscriptions,
  getAllSubscriptions,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  markPaid,
} = require("../controllers/subscription.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.post("/",     protect, authorize("user"),  subscribe);
router.get("/mine",  protect, authorize("user"),  getMySubscriptions);
router.get("/",      protect, authorize("admin"), getAllSubscriptions);

router.patch("/:id/pause",     protect, authorize("user", "admin"), pauseSubscription);
router.patch("/:id/resume",    protect, authorize("user", "admin"), resumeSubscription);
router.patch("/:id/cancel",    protect, authorize("user", "admin"), cancelSubscription);
router.patch("/:id/mark-paid", protect, authorize("admin"),         markPaid);

module.exports = router;
