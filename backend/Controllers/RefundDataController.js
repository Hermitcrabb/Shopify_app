const {getDB} = require("../Utils/mongodb");

async function RefundAndReturnCollection() {
    const db = getDB();
    console.log("RefundAndReturnCollection: Starting aggregation on 'orders'...");
    try { 
        const pipeline = [
            { 
                $match: { 
                    refunds: { $exists: true, $not: { $size: 0 } }
                } 
            },

            { $unwind: "$refunds" },
            {
                $addFields: {
                    refund_line_item_count: { $size: { $ifNull: ["$refunds.refund_line_items", []] } }
                }
            },
            { $unwind: "$refunds.refund_line_items" },
            {
                $addFields: {
                    refund_item: "$refunds.refund_line_items",
                    total_refund_adjustments: {
                        $reduce: {
                            input: { $ifNull: ["$refunds.order_adjustments", []] },
                            initialValue: 0,
                            in: { $add: ["$$value", { $toDouble: { $ifNull: ["$$this.amount", 0] } }] }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: { $toString: "$refund_item.id" },
                    refund_id: { $toString: "$refunds.id" },
                    order_id: { $toString: "$id" },
                    order_number: "$order_number",
                    item_name: "$refund_item.line_item.name",
                    item_id: { $toString: "$refund_item.line_item_id" },
                    return_date_time: "$refunds.created_at",
                    return_qty: "$refund_item.quantity",
                    return_amount: "$refund_item.subtotal",
                    return_tax: "$refund_item.total_tax",
                    // Pro-rate order adjustments across all items in this refund to avoid double-counting
                    order_adjustment: { 
                        $cond: [
                            { $gt: ["$refund_line_item_count", 0] },
                            { $divide: ["$total_refund_adjustments", "$refund_line_item_count"] },
                            0
                        ]
                    },
                    // Calculate unit discount: (Total Line Discount / Original Quantity)
                    item_discount: {
                        $let: {
                            vars: {
                                total_line_discount: {
                                    $reduce: {
                                        input: { $ifNull: ["$refund_item.line_item.discount_allocations", []] },
                                        initialValue: { $toDouble: 0 },
                                        in: { $add: ["$$value", { $toDouble: { $ifNull: ["$$this.amount", 0] } }] }
                                    }
                                },
                                original_qty: { $max: [{ $toDouble: { $ifNull: ["$refund_item.line_item.quantity", 1] } }, 1] }
                            },
                            in: { $divide: ["$$total_line_discount", "$$original_qty"] }
                        }
                    },
                    customer_identifier: "$customer.email",
                    customer_first_name: "$customer.first_name",
                    customer_last_name: "$customer.last_name"
                }
            },
            {
                $addFields: {
                    // return_total = return_amount + order_adjustment (per Shopify's formula)
                    // return_total = Net Return (excluding tax)
                    // If order_adjustment equals Gross Refund (Subtotal + Tax), it's a full refund entry.
                    // In that case, use return_amount (Subtotal) only.
                    // Otherwise, add adjustment (e.g. shipping refund or partial adjustment).
                    // return_total = Gross Return (Subtotal + Tax)
                    // If Gross Return is 0 (Manual Refund w/o items), use ABS(Order Adjustment).
                    return_total: { 
                        $let: {
                            vars: {
                                gross_calculated: { 
                                    $add: [
                                        { $toDouble: { $ifNull: ["$return_amount", 0] } },
                                        { $toDouble: { $ifNull: ["$return_tax", 0] } }
                                    ]
                                },
                                adj_val: { $toDouble: { $ifNull: ["$order_adjustment", 0] } }
                            },
                            in: {
                                $cond: [
                                    { $gt: ["$$gross_calculated", 0] },
                                    "$$gross_calculated",
                                    { $abs: "$$adj_val" }
                                ]
                            }
                        }
                    },
                    return_tax: { $toDouble: { $ifNull: ["$return_tax", 0] } },
                    order_adjustment: { $toDouble: { $ifNull: ["$order_adjustment", 0] } },
                    restock: "$refund_info.restock",
                    is_test_order: { 
                        $or: [
                            { $in: ["$order_number", [1021, 1007]] },
                            { $ne: [ { $indexOfCP: [ { $toLower: { $ifNull: ["$tags", ""] } }, "test" ] }, -1 ] }
                        ]
                    },
                    sortDate: { $toDate: "$return_date_time" }
                }
            },
            { $sort: { sortDate: -1 } },
            { $project: { sortDate: 0, tags: 0, refund_info: 0 } }, // Remove temporary fields
            { $out: "return_and_refund" }
        ];

        await db.collection("orders").aggregate(pipeline).toArray();
        console.log("RefundAndReturnCollection: Aggregation finished. Results processed.");

        const refundAndReturn = db.collection("return_and_refund");
        await refundAndReturn.createIndex({ return_date_time: 1 });
        await refundAndReturn.createIndex({ item_name: 1 });
        await refundAndReturn.createIndex({ customer_identifier: 1 });
        await refundAndReturn.createIndex({ order_number: 1 });
        await refundAndReturn.createIndex({ refund_id: 1 });

        console.log("RefundAndReturnCollection: Indexes updated.");
    } catch (err) { 
        console.error("RefundAndReturnCollection: ERROR:", err);
    }
};


module.exports = { RefundAndReturnCollection };
