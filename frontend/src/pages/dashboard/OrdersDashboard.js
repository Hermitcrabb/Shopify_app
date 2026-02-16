import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/Dashboard.css";

const OrdersDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [pivotData, setPivotData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetailedData = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const response = await fetch("http://localhost:8080/admin-api/analytics/detailed", {
          headers: { "Authorization": token }
        });
        const result = await response.json();
        if (result.success) {
          setOrders(result.orders);
          setPivotData(result.pivotData);
        }
      } catch (error) {
        console.error("Error fetching detailed analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedData();
  }, []);

  // Heatmap helper: returns a background color based on price intensity
  const getHeatmapColor = (price) => {
    const maxPrice = 50000; // Reference max price for scaling
    const intensity = Math.min(price / maxPrice, 1);
    return `rgba(38, 70, 83, ${0.1 + intensity * 0.9})`; // Dark teal theme
  };

  if (loading) return <div className="admin-dashboard">Loading Analytics...</div>;

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Orders Analytics</h1>
        <button onClick={() => navigate("/admin/dashboard")} className="logout-btn" style={{ background: "#457b9d" }}>
          Back to Dashboard
        </button>
      </header>

      <div className="admin-content">
        <div className="admin-section">
          <h2>Pivot Table: Top Revenue Orders</h2>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Total Price</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {pivotData.map((data) => (
                <tr key={data._id}>
                  <td>{data.order_number}</td>
                  <td>{data.customer_name || "N/A"}</td>
                  <td>Rs {(data.total_price || 0).toLocaleString()}</td>
                  <td>{data.created_at ? new Date(data.created_at).toLocaleDateString() : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-section">
          <h2>Detailed Orders Heatmap</h2>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const price = parseFloat(order.total_price || 0);
                return (
                  <tr key={order._id}>
                    <td>{order.order_number}</td>
                    <td>{order.customer?.first_name || ""} {order.customer?.last_name || ""}</td>
                    <td>{order.financial_status}</td>
                    <td style={{ 
                      backgroundColor: getHeatmapColor(price),
                      color: price > 25000 ? "#fff" : "#000",
                      fontWeight: "bold"
                    }}>
                      Rs {price.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrdersDashboard;
