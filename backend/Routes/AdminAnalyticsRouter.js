const express = require("express");
const { getDashboardStats, getDetailedAnalytics, getAnalyticsData, getRefundData, syncAnalytics } = require("../Controllers/AnalyticsController");
const verifyAdmin = require("../Middlewares/VerifyAdmin");
const router = express.Router();

// Middleware to verify admin token (assuming simple token check for now as requested)


router.get("/analytics/stats", verifyAdmin, getDashboardStats);
router.get("/analytics/detailed", verifyAdmin, getDetailedAnalytics);
router.get("/analytics/collection", verifyAdmin, getAnalyticsData);
router.get("/analytics/refunds", verifyAdmin, getRefundData);
router.post("/analytics/sync", verifyAdmin, syncAnalytics);


module.exports = router;
