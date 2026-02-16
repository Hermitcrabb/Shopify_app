const express = require("express");
const { processShopifyWebhook } = require("../Controllers/ShopifyWebhookController");
const router = express.Router();

router.post("/shopify",
    express.raw({ type: "application/json" }),
    processShopifyWebhook);

module.exports = router;
