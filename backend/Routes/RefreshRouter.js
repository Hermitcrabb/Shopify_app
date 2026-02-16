const express = require("express");
const router = express.Router();
const { refreshAnalyticsCollection } = require("../Controllers/DataController");
const { RefundAndReturnCollection } = require("../Controllers/RefundDataController");

// Manual refresh endpoint for testing
router.post("/manual-refresh", async (req, res) => {
    try {
        console.log("\n=== MANUAL REFRESH TRIGGERED ===");
        
        // Refresh both collections
        await refreshAnalyticsCollection();
        await RefundAndReturnCollection();
        
        console.log("=== REFRESH COMPLETE ===\n");
        
        res.status(200).json({
            success: true,
            message: "Analytics and refund collections refreshed successfully"
        });
    } catch (error) {
        console.error("Manual refresh error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to refresh collections",
            error: error.message
        });
    }
});

module.exports = router;
