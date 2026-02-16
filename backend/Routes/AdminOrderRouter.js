const express = require("express");
const router = express.Router();
const verifyAdmin = require("../Middlewares/VerifyAdmin");
const { fulfillOrder, cancelOrder, refundOrder, returnOrder } = require("../Controllers/ShopifyOrderController");


// 1. Fulfillment Route
router.post("/admin/:orderID/fulfill", verifyAdmin, async (req, res) => {
    console.log(`\n--- INCOMING ROUTE REQUEST: /admin-order/admin/${req.params.orderID}/fulfill ---`);
    console.log(`Body:`, JSON.stringify(req.body));
    
    try {
        const { orderID } = req.params;
        const { trackingInfo } = req.body;

        const result = await fulfillOrder(orderID, { trackingInfo });

        console.log(`Route Success Response sent.`);
        res.status(200).json({
            success: true,
            message: "Order fulfilled successfully via Functional REST API",
            fulfillment: result.fulfillment
        });
    } catch (err) {
        console.error(`Route Error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// 2. Cancel Route
router.post("/:orderID/cancel", verifyAdmin, async (req, res) => {
    console.log(`\n--- INCOMING ROUTE REQUEST: /admin-order/${req.params.orderID}/cancel ---`);
    console.log(`Body:`, JSON.stringify(req.body));
    
    try {
        const { orderID } = req.params;
        const { reason } = req.body;

        const result = await cancelOrder(orderID, reason);

        console.log(`Route Success Response sent.`);
        res.status(200).json({
            success: true,
            message: "Order cancelled successfully via Functional REST API",
            order: result.order
        });
    } catch (err) {
        console.error(`Route Error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// 3. Refund Route
router.post("/:orderID/refund", verifyAdmin, async (req, res) => {
    console.log(`\n--- INCOMING ROUTE REQUEST: /admin-order/${req.params.orderID}/refund ---`);
    console.log(`Body:`, JSON.stringify(req.body));
    
    try {
        const { orderID } = req.params;
        const { type, amount, refundItems, reason, note } = req.body;

        const result = await refundOrder(orderID, { type, amount, refundItems, reason, note });

        console.log(`Route Success Response sent.`);
        res.status(200).json({
            success: true,
            message: `Order refund (${type}) processed successfully`,
            refund: result.refund
        });
    } catch (err) {
        console.error(`Route Error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// 4. Return Route
router.post("/:orderID/return", verifyAdmin, async (req, res) => {
    console.log(`\n--- INCOMING ROUTE REQUEST: /admin-order/${req.params.orderID}/return ---`);
    console.log(`Body:`, JSON.stringify(req.body));
    
    try {
        const { orderID } = req.params;
        const { returnItems, reason, note } = req.body;

        const result = await returnOrder(orderID, { returnItems, reason, note });

        console.log(`Route Success Response sent.`);
        res.status(200).json({
            success: true,
            message: `Order return processed successfully. Tracking: #${result.trackingNumber}`,
            trackingNumber: result.trackingNumber,
            refund: result.refund
        });
    } catch (err) {
        console.error(`Route Error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

module.exports = router;
