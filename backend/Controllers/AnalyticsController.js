const { getDB } = require("../Utils/mongodb");

const getDashboardStats = async (req, res) => {
  try {
    const { range = "30d", startDate, endDate } = req.query;
    const db = getDB();
    const analyticsCollection = db.collection("analytics_collection");
    const refundsCollection = db.collection("return_and_refund");

    console.log(`📊 Fetching Dashboard Stats from Analytics Collection. Range: ${range}, Start: ${startDate}, End: ${endDate}`);

    // Helper for date filter
    const getDateFilter = (range, start, end, dateField) => {
      const now = new Date();
      if (start && end) {
        return {
          [dateField]: {
            $gte: new Date(start).toISOString(),
            $lte: new Date(new Date(end).setHours(23, 59, 59, 999)).toISOString()
          }
        };
      }
      if (range === "all") return {};
      
      let startDateObj = new Date();
      if (range === "7d") startDateObj.setDate(now.getDate() - 7);
      else if (range === "30d") startDateObj.setDate(now.getDate() - 30);
      else if (range === "90d") startDateObj.setDate(now.getDate() - 90);
      else if (range === "1y") startDateObj.setFullYear(now.getFullYear() - 1);
      else return { [dateField]: { $exists: true, $ne: null } };

      return {
        [dateField]: {
          $gte: startDateObj.toISOString(),
          $lte: new Date(now.setHours(23, 59, 59, 999)).toISOString()
        }
      };
    };

    const salesDateFilter = getDateFilter(range, startDate, endDate, "purchase_date_time");
    const refundsDateFilter = getDateFilter(range, startDate, endDate, "return_date_time");

    // 1. Sales Metrics from analytics_collection
    const salesSummaryPromise = analyticsCollection.aggregate([
      { $match: { ...salesDateFilter, transaction_id: { $exists: true } } },
      // First, group by customer to determine their status specifically within this range
      {
        $group: {
          _id: "$customer_identifier",
          isNewInPeriod: { $max: { $cond: [{ $eq: ["$customer_type", "New Customer"] }, 1, 0] } },
          customerOrders: { $addToSet: "$transaction_id" },
          customerGross: { $sum: "$item_amount" },
          customerTax: { $sum: { $multiply: [{ $ifNull: ["$item_tax", 0] }, "$item_qty"] } },

          customerDiscount: { $sum: { $multiply: [{ $ifNull: ["$item_discount", 0] }, "$item_qty"] } },
          customerShipping: { $sum: { $ifNull: ["$item_shipping", 0] } },
          customerNetRevenue: { $sum: { $subtract: [{ $add: ["$item_amount", { $multiply: [{ $ifNull: ["$item_tax", 0] }, "$item_qty"] }, { $ifNull: ["$item_shipping", 0] }] }, { $multiply: [{ $ifNull: ["$item_discount", 0] }, "$item_qty"] }] } }
        }
      },
      // Second, group by null to get global totals
      {
        $group: {
          _id: null,
          totalOrdersList: { $push: "$customerOrders" },
          grossSales: { $sum: "$customerGross" },
          totalTax: { $sum: "$customerTax" },
          totalDiscounts: { $sum: "$customerDiscount" },
          totalShipping: { $sum: "$customerShipping" },
          newCustomersCount: { $sum: "$isNewInPeriod" },
          returningCustomersCount: { $sum: { $cond: [{ $eq: ["$isNewInPeriod", 0] }, 1, 0] } },
          newCustomerRevenue: { $sum: { $cond: [{ $eq: ["$isNewInPeriod", 1] }, "$customerNetRevenue", 0] } },
          returningCustomerRevenue: { $sum: { $cond: [{ $eq: ["$isNewInPeriod", 0] }, "$customerNetRevenue", 0] } }
        }
      },
      {
        $project: {
          totalOrders: { 
            $size: { 
              $reduce: {
                input: "$totalOrdersList",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] }
              }
            }
          },
          grossSales: 1,
          totalTax: 1,
          totalDiscounts: 1,
          totalShipping: 1,
          newCustomersCount: 1,
          returningCustomersCount: 1,
          newCustomerRevenue: 1,
          returningCustomerRevenue: 1
        }
      }
    ]).toArray();

    // 2. Refund Metrics from return_and_refund
    const refundsSummaryPromise = refundsCollection.aggregate([
      { $match: refundsDateFilter },
      {
        $group: {
          _id: null,
          totalReturns: { 
            $sum: { 
              $cond: [
                { $eq: ["$is_test_order", true] },
                0,
                { $toDouble: "$return_total" }
              ] 
            } 
          },
          totalReturnTax: { $sum: { $toDouble: "$return_tax" } }
        }
      }
    ]).toArray();

    const [salesSummary, refundsSummary] = await Promise.all([salesSummaryPromise, refundsSummaryPromise]);

    const sales = salesSummary[0] || {
      totalOrders: 0,
      grossSales: 0,
      totalTax: 0,
      totalDiscounts: 0,
      totalShipping: 0,
      newCustomersCount: 0,
      returningCustomersCount: 0,
      newCustomerRevenue: 0,
      returningCustomerRevenue: 0
    };
    const totalReturns = refundsSummary[0]?.totalReturns || 0;

    // Reconciliation Formulas
    // Gross Tax is sales.totalTax. We need to subtract return tax.
    const totalReturnTax = refundsSummary[0]?.totalReturnTax || 0;
    const netTax = sales.totalTax - totalReturnTax;
    
    // Net Sales = Gross Sales - Discounts - Returns (Amount + Adjustment)
    // Note: totalReturns from aggregation includes (return_amount + order_adjustment)
    const netSales = sales.grossSales - sales.totalDiscounts - totalReturns;
    
    // Total Sales = Net Sales + Net Tax + Shipping
    const totalRevenue = netSales + sales.totalShipping + netTax;

    const summary = {
      totalOrders: sales.totalOrders,
      totalRevenue,
      netSales,
      totalReturns,
      grossSales: sales.grossSales,
      totalDiscounts: sales.totalDiscounts,
      totalTax: netTax, // Send Net Tax to frontend
      totalShipping: sales.totalShipping,
      newCustomersCount: sales.newCustomersCount,
      returningCustomersCount: sales.returningCustomersCount,
      newCustomerRevenue: sales.newCustomerRevenue,
      returningCustomerRevenue: sales.returningCustomerRevenue,
      aov: sales.totalOrders > 0 ? totalRevenue / sales.totalOrders : 0
    };

    // 3. All time customer count (using email/identifier)
    const allTimeCustomers = (await analyticsCollection.distinct("customer_identifier")).length;

    // 4. Time-series Stats for Charts
    let dateFormat = "%Y-%m-%d";
    if (range === "1y" || range === "all") dateFormat = "%Y-%m";

    const stats = await analyticsCollection.aggregate([
      { $match: { ...salesDateFilter } },
      {
        $unionWith: {
          coll: "return_and_refund",
          pipeline: [{ $match: { ...refundsDateFilter, is_test_order: { $ne: true } } }]
        }
      },
      {
        $addFields: {
          effectiveDate: { $ifNull: ["$purchase_date_time", "$return_date_time"] }
        }
      },
      {
        $addFields: {
          createdAtDate: { $toDate: "$effectiveDate" }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAtDate" } },
          totalSales: { 
            $sum: { 
              $subtract: [
                { $subtract: [{ $add: [{ $ifNull: ["$item_amount", 0] }, { $multiply: [{ $ifNull: ["$item_tax", 0] }, { $ifNull: ["$item_qty", 0] }] }, { $ifNull: ["$item_shipping", 0] }] }, { $multiply: [{ $ifNull: ["$item_discount", 0] }, { $ifNull: ["$item_qty", 0] }] }] },
                { $toDouble: { $ifNull: ["$return_total", 0] } }
              ]
            } 
          },
          orderCount: { $addToSet: "$transaction_id" },
          returningOrders: {
            $addToSet: {
              $cond: [
                { $eq: ["$customer_type", "Returning Customer"] },
                "$transaction_id",
                null
              ]
            }
          },
          newOrders: {
            $addToSet: {
              $cond: [
                { $eq: ["$customer_type", "New Customer"] },
                "$transaction_id",
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalSales: 1,
          orderCount: { 
            $size: { $filter: { input: "$orderCount", as: "id", cond: { $ne: ["$$id", null] } } } 
          },
          returningCount: { 
            $size: { $filter: { input: "$returningOrders", as: "id", cond: { $ne: ["$$id", null] } } } 
          },
          newCount: {
            $size: { $filter: { input: "$newOrders", as: "id", cond: { $ne: ["$$id", null] } } } 
          }
        }
      },
      {
        $addFields: {
          returningRate: {
            $cond: [
              { $gt: ["$orderCount", 0] },
              { $multiply: [{ $divide: ["$returningCount", "$orderCount"] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.status(200).json({ 
      success: true, 
      summary: {
        ...summary,
        allTimeCustomers
      },
      stats 
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getDetailedAnalytics = async (req, res) => {
  try {
    const db = getDB();
    const analyticsCollection = db.collection("analytics_collection");

    // Fetch latest unique orders from analytics (grouped by transaction_id)
    const orders = await analyticsCollection.aggregate([
      { $sort: { purchase_date_time: -1 } },
      {
        $group: {
          _id: "$transaction_id",
          order_number: { $first: "$order_number" },
          financial_status: { $first: { $ifNull: ["$financial_status", "paid"] } },
          fulfillment_status: { $first: { $ifNull: ["$fulfillment_status", "unfulfilled"] } },
          cancelled_at: { $first: "$cancelled_at" },
          customer_first_name: { $first: "$customer_first_name" },
          customer_last_name: { $first: "$customer_last_name" },
          customer_email: { $first: "$customer_email" },
          purchase_date_time: { $first: "$purchase_date_time" },
          refunds: { $first: "$refunds" },
          note_attributes: { $first: "$note_attributes" },
          line_items: {
            $push: {
              title: "$item_name",
              quantity: "$item_qty",
              price: "$item_price",
              fulfillment_status: { $ifNull: ["$line_item_fulfillment_status", "null"] },
              // For compatibility with the frontend's discount/tax reducers
              discount_allocations: [{ amount: { $ifNull: ["$item_discount", 0] } }],
              tax_lines: [{ price: { $ifNull: ["$item_tax", 0] }, rate: 0.13 }] // Assuming 13% for UI hint
            }
          },
          totalAmount: { 
            $sum: { 
              $subtract: [
                { $add: ["$item_amount", { $multiply: [{ $ifNull: ["$item_tax", 0] }, "$item_qty"] }, { $ifNull: ["$item_shipping", 0] }] },
                { $multiply: [{ $ifNull: ["$item_discount", 0] }, "$item_qty"] }
              ]
            } 
          }
        }
      },
      { $sort: { purchase_date_time: -1 } },
      { $limit: 50 },
      {
        $project: {
          id: "$_id",
          order_number: 1,
          financial_status: 1,
          fulfillment_status: 1,
          cancelled_at: 1,
          customer: { 
            first_name: "$customer_first_name", 
            last_name: "$customer_last_name",
            email: "$customer_email"
          },
          created_at: "$purchase_date_time",
          total_price: "$totalAmount",
          line_items: 1,
          refunds: 1,
          note_attributes: 1
        }
      }
    ]).toArray();

    // Pivot Data: Top Spending Customers
    const pivotData = await analyticsCollection.aggregate([
      {
        $group: {
          _id: "$customer_identifier",
          customer_name: { $first: { $concat: [{ $ifNull: ["$customer_first_name", "Customer"] }, " ", { $ifNull: ["$customer_last_name", ""] }] } },
          uniqueOrders: { $addToSet: "$transaction_id" },
          totalSpend: { $sum: { $subtract: [{ $add: ["$item_amount", { $multiply: [{ $ifNull: ["$item_tax", 0] }, "$item_qty"] }] }, { $multiply: [{ $ifNull: ["$item_discount", 0] }, "$item_qty"] }] } }
        }
      },
      {
        $project: {
          _id: 1,
          customer_name: 1,
          totalOrders: { $size: "$uniqueOrders" },
          totalSpend: 1
        }
      },
      { $sort: { totalSpend: -1 } },
      { $limit: 20 }
    ]).toArray();

    // 3. Product Performance: Net revenue (Gross - Discounts - Returns + Tax) per product
    const productPerformance = await analyticsCollection.aggregate([
      {
        $unionWith: {
          coll: "return_and_refund",
          pipeline: []
        }
      },
      {
        $group: {
          _id: "$item_name",
          // Sales side: Gross + Tax - Discounts
          salesRevenue: { 
            $sum: { 
              $cond: [
                { $ifNull: ["$item_amount", false] },
                { $subtract: [
                  { $add: ["$item_amount", { $multiply: [{ $ifNull: ["$item_tax", 0] }, "$item_qty"] }] },
                  { $multiply: [{ $ifNull: ["$item_discount", 0] }, "$item_qty"] }
                ]},
                0
              ]
            }
          },
          // Returns side: Total returned (negative)
          returnsAmount: {
            $sum: {
              $cond: [
                { $ifNull: ["$return_total", false] },
                { $toDouble: "$return_total" },
                0
              ]
            }
          },
          totalTax: { $sum: { $multiply: [{ $ifNull: ["$item_tax", 0] }, "$item_qty"] } },
          totalOrders: { $addToSet: "$transaction_id" },
          totalQuantity: { $sum: { $ifNull: ["$item_qty", 0] } }
        }
      },
      {
        $project: {
          _id: 1,
          // Net Revenue = Sales Revenue - Returns
          totalRevenue: { $subtract: ["$salesRevenue", "$returnsAmount"] },
          totalOrders: { $size: { $filter: { input: "$totalOrders", as: "id", cond: { $ne: ["$$id", null] } } } },
          totalQuantity: 1
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 }
    ]).toArray();

    res.status(200).json({ success: true, orders, pivotData, productPerformance });

  } catch (error) {
    console.error("Error fetching detailed analytics:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAnalyticsData = async (req, res) => {
  try {
    const db = getDB();
    const analyticsCollection = db.collection("analytics_collection");

    // Fetch the stored analytics data
    // We can add sorting or pagination if needed, but for now, we'll return the latest.
    const data = await analyticsCollection.find()
      .sort({ purchase_date_time: -1 })
      .limit(100)
      .toArray();

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error("Error fetching analytics collection data:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getRefundData = async (req, res) => {
  try {
    const db = getDB();
    const collection = db.collection("return_and_refund");

    const data = await collection.find()
      .sort({ return_date_time: -1 })
      .limit(100)
      .toArray();

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error("Error fetching refund data:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const syncAnalytics = async (req, res) => {
  try {
    const { refreshAnalyticsCollection } = require("./DataController");
    const { RefundAndReturnCollection } = require("./RefundDataController");
    
    // Run both refreshes
    await Promise.all([
      refreshAnalyticsCollection(),
      RefundAndReturnCollection()
    ]);

    res.status(200).json({ success: true, message: "Analytics and Refunds collections synced successfully" });
  } catch (error) {
    console.error("Error syncing analytics/refunds:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getDashboardStats,
  getDetailedAnalytics,
  getAnalyticsData,
  getRefundData,
  syncAnalytics
};
