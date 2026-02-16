const axios = require("axios");


// Configuration from environment variables
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

if(!SHOPIFY_STORE_DOMAIN){
    throw new Error("store domain is invalid!!");
}
if(!SHOPIFY_ADMIN_TOKEN){
    throw new Error("admin token is invalid!!");
}

const restBaseUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01`;

// Axios instance for REST API
const client = axios.create({
    baseURL: restBaseUrl,
    headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
        'Content-Type': 'application/json'
    }
});

/**
 * Extracts numerical ID from a Shopify GID or returns the ID if already numerical
 */
const extractNumericId = (id) => {
    if (!id) return null;
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
        const match = id.match(/\/(\d+)$/);
        return match ? match[1] : id;
    }
    return id;
};

/**
 * Fulfillment using REST API
 */
const fulfillOrder = async (orderId, fulfillmentData) => {
    const { trackingInfo } = fulfillmentData;
    const numericOrderId = extractNumericId(orderId);

    console.log(`\n--- START FULFILLMENT LOG ---`);
    console.log(`Order ID Provided: ${orderId}`);
    console.log(`Numeric Order ID: ${numericOrderId}`);
    console.log(`Tracking Info:`, JSON.stringify(trackingInfo));

    // 1. Get Fulfillment Orders via REST API
    let fulfillmentOrders;
    try {
        const url = `/orders/${numericOrderId}/fulfillment_orders.json`;
        console.log(`Fetching FO from: ${restBaseUrl}${url}`);
        const response = await client.get(url);
        fulfillmentOrders = response.data.fulfillment_orders;
        console.log(`Fulfillment Orders Found: ${fulfillmentOrders?.length || 0}`);
        
        if (fulfillmentOrders && fulfillmentOrders.length > 0) {
            fulfillmentOrders.forEach((fo, idx) => {
                console.log(`  [${idx}] FO ID: ${fo.id}, Status: ${fo.status}, Request Status: ${fo.request_status}`);
            });
        }
    } catch (error) {
        console.error("Error Fetching Fulfillment Orders:", error.response?.data || error.message);
        console.log(`END FULFILLMENT LOG (ERROR) \n`);
        throw new Error(`Shopify REST Error (Fetch): ${JSON.stringify(error.response?.data || error.message)}`);
    }

    if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
        console.log(`END FULFILLMENT LOG (NO FO FOUND) \n`);
        throw new Error(`No fulfillment orders found for Order ID: ${numericOrderId}`);
    }



    // 3. Find an OPEN fulfillment order
    const openFO = fulfillmentOrders.find(fo => fo.status === 'open');
    if (!openFO) {
        console.log(`Available statuses: ${fulfillmentOrders.map(fo => fo.status).join(', ')}`);
        console.log(`END FULFILLMENT LOG (NO OPEN FO) \n`);
        throw new Error(`No open fulfillment orders found. All are likely fulfilled, cancelled, or in-progress.`);
    }

    // 4. Create Fulfillment via REST API
    const payload = {
        fulfillment: {
            line_items_by_fulfillment_order: [
                {
                    fulfillment_order_id: openFO.id,
                    fulfillment_order_line_items: openFO.line_items.map(item => ({
                        id: item.id,
                        quantity: item.quantity - item.fulfilled_quantity
                    })).filter(item => item.quantity > 0)
                }
            ],
            notify_customer: true
        }
    };

    if (trackingInfo && (trackingInfo.number || trackingInfo.company)) {
        payload.fulfillment.tracking_info = {
            number: trackingInfo.number || "",
            company: trackingInfo.company || "",
            url: trackingInfo.url || ""
        };
    }

    console.log(`Creating Fulfillment with Payload:`, JSON.stringify(payload, null, 2));

    try {
        const response = await client.post('/fulfillments.json', payload);
        console.log(`Fulfillment Created Successfully: ${response.data.fulfillment.id}`);
        console.log(`END FULFILLMENT LOG (SUCCESS) \n`);
        return {
            success: true,
            fulfillment: response.data.fulfillment
        };
    } catch (error) {
        console.error("Fulfillment POST Failed:", JSON.stringify(error.response?.data || error.message, null, 2));
        console.log(`END FULFILLMENT LOG (ERROR) \n`);
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Shopify REST Error (Create): ${detail}`);
    }
};


/**
 * Refund using REST API
 * Supports:
 * 1. Monetary Glitch (amount only)
 * 2. Item Return (items and quantities)
 */
const refundOrder = async (orderId, refundData) => {
    const { type, amount, refundItems, reason = "customer", note = "" } = refundData;
    const numericOrderId = extractNumericId(orderId);
    
    console.log(`\nSTART REFUND LOG`);
    console.log(`Order: ${numericOrderId}, Type: ${type}, Reason: ${reason}`);

    try {
        // Step 1: Calculate Refund
        const calculatePayload = {
            refund: {
                shipping: { full_refund: false },
                refund_line_items: []
            }
        };

        if (type === 'ITEM' && refundItems && refundItems.length > 0) {
            calculatePayload.refund.refund_line_items = refundItems.map(item => ({
                line_item_id: extractNumericId(item.id),
                quantity: item.quantity,
                restock_type: "return", // Assumes items are being returned to stock
                location_id: item.location_id || null // Shopify will suggest or use default
            }));
        }

        console.log(`Calculating refund...`);
        const calcRes = await client.post(`/orders/${numericOrderId}/refunds/calculate.json`, calculatePayload);
        let refund = calcRes.data.refund;

        // Step 2: Adjust Transactions for MONETARY type
        if (type === 'MONETARY') {
            console.log(`Adjusting transactions for monetary glitch refund: ${amount}`);
            if (refund.transactions && refund.transactions.length > 0) {
                refund.transactions[0].amount = amount;
                refund.transactions[0].kind = "refund";
            } else {
                throw new Error("No transactions suggested by Shopify for calculation.");
            }
        }

        // Step 3: Create Refund
        const createPayload = {
            refund: {
                currency: refund.currency,
                notify: true,
                note: note || `Refund type: ${type}. ${reason}`,
                refund_line_items: refund.refund_line_items,
                transactions: (refund.transactions || []).map(t => ({
                    ...t,
                    kind: t.kind === 'suggested_refund' ? 'refund' : t.kind
                }))
            }
        };


        console.log(`Creating refund with payload:`, JSON.stringify(createPayload, null, 2));
        const finalRes = await client.post(`/orders/${numericOrderId}/refunds.json`, createPayload);
        
        console.log(`Refund Created Successfully: ${finalRes.data.refund.id}`);
        console.log(`END REFUND LOG (SUCCESS) \n`);

        return {
            success: true,
            refund: finalRes.data.refund
        };

    } catch (error) {
        console.error("Refund Failed:", JSON.stringify(error.response?.data || error.message, null, 2));
        console.log(`END REFUND LOG (ERROR) \n`);
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Shopify REST Error (Refund): ${detail}`);
    }
};



/**
 * Order Return Logic
 * - Processes Shopify refund with restocking
 * - Updates Order Note in Shopify
 */
const returnOrder = async (orderId, returnData) => {
    const { returnItems, reason = "customer", note = "" } = returnData;
    const numericOrderId = extractNumericId(orderId);
    
    console.log(`\n START RETURN LOG`);
    console.log(`Order: ${numericOrderId}, Items: ${returnItems.length}`);

    try {
        // 1. Generate Tracking Number (RTN + Timestamp)
        const trackingNo = `RTN-${Date.now()}`;
        console.log(`Generated Tracking No: ${trackingNo}`);

        // 2. Prepare Calculate Refund Payload (for restocking)
        const calculatePayload = {
            refund: {
                shipping: { full_refund: false },
                refund_line_items: returnItems.map(item => ({
                    line_item_id: extractNumericId(item.id),
                    quantity: item.quantity,
                    restock_type: "return"
                }))
            }
        };

        console.log(`Calculating return/restock...`);
        const calcRes = await client.post(`/orders/${numericOrderId}/refunds/calculate.json`, calculatePayload);
        const refund = calcRes.data.refund;

        // 3. Create Refund (without monetary amount if unfulfilled/unpaid)
        // Shopify calculate will handle the transaction logic based on payment status
        const createPayload = {
            refund: {
                currency: refund.currency,
                notify: true,
                note: `Return Tracking: #${trackingNo}. ${note || reason}`,
                refund_line_items: refund.refund_line_items,
                transactions: (refund.transactions || []).map(t => ({
                    ...t,
                    kind: t.kind === 'suggested_refund' ? 'refund' : t.kind
                }))
            }
        };


        console.log(`Creating Shopify Return record...`);
        const finalRes = await client.post(`/orders/${numericOrderId}/refunds.json`, createPayload);

        // 4. Update Shopify Order with Tracking Number in Note Attributes
        console.log(`Updating order notes with tracking number...`);
        const orderRes = await client.get(`/orders/${numericOrderId}.json`);
        const currentNoteAttributes = orderRes.data.order.note_attributes || [];
        
        const updatedNoteAttributes = [
            ...currentNoteAttributes.filter(attr => attr.name !== 'Return Tracking'),
            { name: "Return Tracking", value: String(trackingNo) }
        ];

        await client.put(`/orders/${numericOrderId}.json`, {
            order: {
                id: numericOrderId,
                note_attributes: updatedNoteAttributes
            }
        });



        console.log(`Order Return Processed: Tracking #${trackingNo}`);
        console.log(`END RETURN LOG (SUCCESS) \n`);

        return {
            success: true,
            trackingNumber: trackingNo,
            refund: finalRes.data.refund
        };

    } catch (error) {
        console.error("Return Failed:", error.response?.data || error.message);
        console.log(`END RETURN LOG (ERROR) \n`);
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Shopify REST Error (Return): ${detail}`);
    }
};



/**
 * Cancel using REST API
 * Including inventory restock and refund if paid
 */
const cancelOrder = async (orderId, reason = 'customer') => {
    const numericOrderId = extractNumericId(orderId);
    console.log(`\nSTART CANCELLATION LOG`);
    console.log(`Order ID: ${numericOrderId}, Reason: ${reason}`);

    try {
        // 1. Fetch Order details to check financial status and amount
        console.log(`Fetching order details for ${numericOrderId}...`);
        const orderRes = await client.get(`/orders/${numericOrderId}.json`);
        const order = orderRes.data.order;

        if (!order) {
            throw new Error(`Order ${numericOrderId} not found.`);
        }

        console.log(`Financial Status: ${order.financial_status}, Total: ${order.total_price} ${order.currency}`);

        // 2. Prepare Cancellation Payload
        const payload = {
            reason: reason,
            email: true,
            restock: true // User requested inventory restocking
        };

        // 3. Handle Refund if paid
        if (['paid', 'partially_paid'].includes(order.financial_status)) {
            console.log(`Order is paid/partially paid. Including refund in cancellation.`);
            payload.amount = order.total_price;
            payload.currency = order.currency;
        } else {
            console.log(`Order is ${order.financial_status}. No refund needed during cancellation.`);
        }

        // 4. Call Cancel Endpoint
        console.log(`Sending Cancel Request for ${numericOrderId}...`);
        const cancelRes = await client.post(`/orders/${numericOrderId}/cancel.json`, payload);
        
        console.log(`Order Cancelled Successfully: ${cancelRes.data.order.id}`);
        console.log(`END CANCELLATION LOG (SUCCESS) \n`);

        return {
            success: true,
            order: cancelRes.data.order
        };
    } catch (error) {
        console.error("Cancellation Failed:", error.response?.data || error.message);
        console.log(`END CANCELLATION LOG (ERROR) \n`);
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Shopify REST Error (Cancel): ${detail}`);
    }
};


module.exports = {
    fulfillOrder,
    refundOrder,
    cancelOrder,
    returnOrder,
    extractNumericId
};

