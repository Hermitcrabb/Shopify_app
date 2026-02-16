const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { getDB } = require("../Utils/mongodb");
const { refreshAnalyticsCollection } = require("./DataController");
const { RefundAndReturnCollection } = require("./RefundDataController");

let isRefreshing = false;
let pendingRefresh = false;

const triggerAnalyticsRefresh = async () => {
  if (isRefreshing) {
    pendingRefresh = true;
    return;
  }

  isRefreshing = true;
  pendingRefresh = false;

  try {
    // Wait 2 seconds to allow other concurrent webhooks to finish DB operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    await Promise.all([
      refreshAnalyticsCollection(),
      RefundAndReturnCollection()
    ]);
  } catch (err) {
    console.error("Debounced Analytics Refresh Error:", err);
  } finally {
    isRefreshing = false;
    if (pendingRefresh) {
      triggerAnalyticsRefresh();
    }
  }
};

const logWebhook = (topic, shop, payload) => {
  const logFile = path.join(process.cwd(), "shopify_webhooks.log");

  const separator = "=".repeat(80);
  const timestamp = new Date().toISOString();
  const localTime = new Date().toLocaleString();

  const logEntry = `
${separator}
📦 WEBHOOK RECEIVED
${separator}
⏰ Timestamp: ${timestamp} (${localTime})
🏬 Shop: ${shop}
📌 Topic: ${topic}
${separator}
📄 PAYLOAD:
${JSON.stringify(payload, null, 2)}
${separator}

`;
  fs.appendFileSync(logFile, logEntry, "utf8");
};

const verifyShopifyHmac = (req) => {
  const shopifyHmac = req.get("X-Shopify-Hmac-Sha256");
  const body = req.body;
  console.log(body);

  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(req.body, "utf8")
    .digest("base64");
  console.log(generatedHmac);

  return crypto.timingSafeEqual(
    Buffer.from(generatedHmac),
    Buffer.from(shopifyHmac),
  );
};

const processShopifyWebhook = async (req, res) => {
  try {
    //Verify HMAC
    const isValid = verifyShopifyHmac(req);
    if (!isValid) {
      return res.status(401).send("Invalid HMAC header");
    }

    const topic = req.get("X-Shopify-Topic");
    const shop = req.get("X-Shopify-Shop-Domain");
    const payload = JSON.parse(req.body.toString("utf8"));

    console.log("📦 Shopify Webhook Received");
    console.log("🏬 Shop:", shop);
    console.log("📌 Topic:", topic);

    //Respond to Shopify <5sec
    res.status(200).send("Webhook received");

    // Process asynchronously & Log to file
    // logWebhook(topic, shop, payload);

    // Only process REST API calls for order-related topics
    const orderTopics = [
      "orders/create",
      "orders/updated",
      "orders/fulfilled",
      "orders/paid",
      "orders/partially_fulfilled",
    ];

    if (orderTopics.includes(topic)) {
      const orderId = String(payload.id);
      console.log(`🔍 Fetching full order data for ID: ${orderId}`);

      const endpoint = `https://${shop}/admin/api/2024-01/orders/${orderId}.json`;
      const headers = {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json",
      };

      try {
        const response = await fetch(endpoint, { headers });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Shopify API Error (${response.status}):`,
            errorText,
          );
          if (response.status === 404) {
            console.warn(
              "Order not found. This is common with Shopify 'Test' webhooks.",
            );
          }
          return; // Stop processing this webhook if API call fails
        }

        const data = await response.json();

      if (!data.order) {
          console.error("Unexpected Shopify API response format:", data);
          return;
        }

        const fullOrder = data.order;
        console.log(`Successfully fetched order: ${fullOrder.order_number}`);

        // Handle specific topics
        await handleOrder(fullOrder).catch((err) =>
          console.error("Failed to process order:", err),
        );
        await handlewebhook(fullOrder).catch((err) =>
          console.error("Failed to save order payload:", err),
        );

        logWebhook(topic, shop, fullOrder);
        // Trigger analytics refresh (debounced and non-blocking)
        triggerAnalyticsRefresh();

      } catch (fetchError) {
        console.error("Network or Parsing error during fetch:", fetchError);
      }
    }
    // else {
    //   console.log(`Skipping REST call for non-order topic: ${topic}`);
    //   // For other topics, we might still want to save the webhook payload
    //   await handlewebhook(payload).catch((err) =>
    //     console.error("Failed to save webhook payload:", err),
    //   );
    // }
  } catch (error) {
    console.error("Error processing webhook:", error);
    // respond if we haven't already sent a response
    if (!res.headersSent) {
      res.status(500).send("Error processing webhook");
    }
  }
};

/* ===========================================
|| Webhook Handlers
====================================
*/
const handleOrder = async (order) => {
  try {
    console.log("Processing Line Items for Order:", order.order_number);
    const db = getDB();
    const lineItemsCollection = db.collection("order_line_item");
    //we get order & order id delete the old order line items
    await lineItemsCollection.deleteMany({ order_id: order.id });
    for (const item of order.line_items) {
      const lineItemData = {
        // Fields mapped exactly from simpledata.md requirements
        id: item.id,
        admin_graphql_api_id: item.admin_graphql_api_id,
        attributed_staffs: item.attributed_staffs,
        current_quantity: item.current_quantity,
        fulfillable_quantity: item.fulfillable_quantity,
        fulfillment_service: item.fulfillment_service,
        fulfillment_status: item.fulfillment_status,
        gift_card: item.gift_card,
        grams: item.grams,
        name: item.name,
        price: item.price,
        price_set: item.price_set,
        product_exists: item.product_exists,
        product_id: item.product_id,
        properties: item.properties,
        quantity: item.quantity,
        requires_shipping: item.requires_shipping,
        sales_line_item_group_id: item.sales_line_item_group_id,
        sku: item.sku,
        taxable: item.taxable,
        title: item.title,
        total_discount: item.total_discount,
        total_discount_set: item.total_discount_set,
        variant_id: item.variant_id,
        variant_inventory_management: item.variant_inventory_management,
        variant_title: item.variant_title,
        vendor: item.vendor,
        tax_lines: item.tax_lines,
        duties: item.duties,
        discount_allocations: item.discount_allocations,

        // metadata for tracking
        order_id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
      };

      await lineItemsCollection.insertOne(lineItemData);
    }
  } catch (error) {
    console.error("Error saving flattened line items:", error);
  }
};

const handlewebhook = async (payload) => {
  try {
    const db = getDB();
    const collection = db.collection("orders");

    // Delete existing order with same ID
    await collection.deleteMany({ id: payload.id });
    //Insert new orders with different id or updated
    const result = await collection.insertOne(payload);
    console.log(`Webhook saved to database with ID: ${result.insertedId}`);
    return result;
  } catch (error) {
    console.error("Error saving webhook to database:", error);
    throw error;
  }
};


// const handleAppUninstalled = async (shop) => {
//     console.log("App uninstalled from:", shop);
//     // clean up tokens, shop data
// };

module.exports = { processShopifyWebhook };
