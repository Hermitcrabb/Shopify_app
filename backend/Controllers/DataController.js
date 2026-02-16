const {getDB} = require("../Utils/mongodb");

async function refreshAnalyticsCollection() {
    const db = getDB();
    console.log("refreshAnalyticsCollection: Starting aggregation on 'orders'...");
    try {
        const pipeline = [
            {
                $addFields: {
                    order_line_item_count: { $size: { $ifNull: ["$line_items", []] } }
                }
            },
            { $unwind: "$line_items" },
            { 
                $lookup: {
                    from: "orders",
                    let: { custEmail: "$customer.email" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$customer.email", "$$custEmail"] } } },
                        {
                            $group: {
                                _id: null,
                                first: { $min: "$created_at" },
                                last: { $max: "$created_at" },
                                history: { $push: "$created_at" }
                            }
                        }
                    ],
                    as: "customer_history"
                }
            },
            {
                $addFields: {
                    customer_history_doc: { $arrayElemAt: ["$customer_history", 0] },
                    numeric_order_id: { $toString: "$line_items.id" }
                }
            },
            {
                $addFields: {
                    customer_first_order: "$customer_history_doc.first",
                    customer_last_order: "$customer_history_doc.last",
                    customer_type: {
                       $cond: [
                        {$eq :[{$toDate : "$customer_history_doc.first"}, {$toDate : "$created_at"}]},
                        "New Customer",
                        "Returning Customer"
                       ]
                    }
                }
            },
            {
                $project: {
                    _id: "$numeric_order_id",
                    order_number: 1,
                    financial_status: 1,
                    fulfillment_status: 1,
                    cancelled_at: 1,
                    item_name: "$line_items.name",
                    item_price: { $toDouble: "$line_items.price" },
                    line_item_fulfillment_status: "$line_items.fulfillment_status",
                    customer_identifier: "$customer.email",
                    customer_first_name: "$customer.first_name",
                    customer_last_name: "$customer.last_name",
                    customer_email: "$customer.email",
                    refunds: { $ifNull: ["$refunds", []] },
                    note_attributes: { $ifNull: ["$note_attributes", []] },
                    order_tags: "$tags",
                    customer_type: 1,
                    purchase_date_time: "$created_at",
                    transaction_id: { $toString: "$id" },
                    item_category: "products",
                    item_qty: "$line_items.quantity",
                    item_amount: { $multiply: [{ $toDouble: "$line_items.price" }, "$line_items.quantity"] },
                    // Calculate unit tax: (Total Line Tax / Quantity)
                    item_tax: {
                        $let: {
                            vars: {
                                total_tax: {
                                    $reduce: {
                                        input: { $ifNull: ["$line_items.tax_lines", []] },
                                        initialValue: { $toDouble: 0 },
                                        in: { $add: ["$$value", { $toDouble: { $ifNull: ["$$this.price", 0] } }] }
                                    }
                                },
                                original_qty: { $max: [{ $toDouble: { $ifNull: ["$line_items.quantity", 1] } }, 1] }
                            },
                            in: { $divide: ["$$total_tax", "$$original_qty"] }
                        }
                    },
                    // Calculate unit discount: (Total Line Discount / Quantity)
                    item_discount: {
                        $let: {
                            vars: {
                                total_line_discount: {
                                    $reduce: {
                                        input: { $ifNull: ["$line_items.discount_allocations", []] },
                                        initialValue: { $toDouble: 0 },
                                        in: { $add: ["$$value", { $toDouble: { $ifNull: ["$$this.amount", 0] } }] }
                                    }
                                },
                                original_qty: { $max: [{ $toDouble: { $ifNull: ["$line_items.quantity", 1] } }, 1] }
                            },
                            in: { $divide: ["$$total_line_discount", "$$original_qty"] }
                        }
                    },
                    item_shipping: {
                        $cond: [
                            { $gt: ["$order_line_item_count", 0] },
                            { $divide: [{ $toDouble: { $ifNull: ["$total_shipping_price_set.shop_money.amount", { $ifNull: ["$total_shipping_price", 0] }] } }, "$order_line_item_count"] },
                            0
                        ]
                    },
                    first_transaction_date: "$customer_first_order",
                    last_transaction_date: "$customer_last_order"
                }
            },
            {
                $addFields: {
                    sortDate: { $toDate: "$purchase_date_time" }
                }
            },
            { $sort: { sortDate: -1 } },
            { $project: { sortDate: 0 } },
            {
                $out: "analytics_collection"
            }
        ];

        await db.collection("orders").aggregate(pipeline).toArray();
        console.log(`refreshAnalyticsCollection: Aggregation finished. Results processed.`);

        const analytics = db.collection("analytics_collection");
        await analytics.createIndex({ purchase_date_time: 1 });
        await analytics.createIndex({ customer_identifier: 1 });
        await analytics.createIndex({ item_name: 1 });
        await analytics.createIndex({ item_category: 1 });
        await analytics.createIndex({ transaction_id: 1 });
        await analytics.createIndex({ customer_first_name: 1 });
        await analytics.createIndex({ customer_last_name: 1 });
        await analytics.createIndex({ customer_type: 1 });
        await analytics.createIndex({ item_qty: 1 });
        await analytics.createIndex({ item_amount: 1 });
        await analytics.createIndex({ first_transaction_date: 1 });
        await analytics.createIndex({ last_transaction_date: 1 });

        console.log("refreshAnalyticsCollection: Indexes updated.");
    } catch (err) {
        console.error("refreshAnalyticsCollection: ERROR:", err);
    }
}

module.exports = { refreshAnalyticsCollection };
