// pages/admin/AdminDashboard.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Activity, Home, BarChart2, List, LogOut, Search, Receipt } from "lucide-react";
import "../../css/Dashboard.css";

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [stats, setStats] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    allTimeCustomers: 0,
    newCustomersCount: 0,
    returningCustomersCount: 0,
    newCustomerRevenue: 0,
    returningCustomerRevenue: 0,
    totalReturns: 0,
    netSales: 0,
    grossSales: 0,
    totalDiscounts: 0,
    totalTax: 0,
    aov: 0,
    allTimeCustomers: 0
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pivotData, setPivotData] = useState([]);
  const [productPerformance, setProductPerformance] = useState([]);
  const [isOrdersDropdownOpen, setIsOrdersDropdownOpen] = useState(false);

  
  // Custom Date States
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Refund Modal States
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundType, setRefundType] = useState('ITEM'); // 'ITEM' or 'MONETARY'
  const [refundQuantities, setRefundQuantities] = useState({}); // { lineItemId: quantity }
  const [manualRefundAmount, setManualRefundAmount] = useState(0);
  const [refundNote, setRefundNote] = useState("");

  // Return Modal States
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnNote, setReturnNote] = useState("");

  
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setLoading(true);
    try {
      // Fetch Stats with custom dates
      const statsRes = await fetch(`http://localhost:8080/admin-api/analytics/stats?startDate=${startDate}&endDate=${endDate}`, {
        headers: { "Authorization": token }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
        setSummary(statsData.summary);
      }

      // Fetch Detailed Orders for the Orders tab
      const ordersRes = await fetch(`http://localhost:8080/admin-api/analytics/detailed`, {
        headers: { "Authorization": token }
      });
      const ordersData = await ordersRes.json();
      if (ordersData.success) {
        setOrders(ordersData.orders);
        setPivotData(ordersData.pivotData || []);
        setProductPerformance(ordersData.productPerformance || []);
      }

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const adminName = localStorage.getItem("adminName");

    if (!token) {
      navigate("/admin/login");
      return;
    } 
    
    setAdminData({ name: adminName || "Admin" });
    fetchStats();
  }, [navigate, fetchStats]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    navigate("/admin/login");
  };

  const COLORS = ['#264653', '#e76f51', '#2a9d8f', '#e9c46a', '#f4a261'];

  // --- Sub-components for Tabs ---

  const HomeView = () => (
    <div className="view-container">
      <div className="stats-cards">
        <div className="stat-card premium">
          <div className="stat-icon"><DollarSign size={24} /></div>
          <div className="stat-info">
            <h3>Total Revenue</h3>
            <p className="stat-number">Rs {summary.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card premium">
          <div className="stat-icon"><ShoppingCart size={24} /></div>
          <div className="stat-info">
            <h3>Total Transactions</h3>
            <p className="stat-number">{summary.totalOrders}</p>
          </div>
        </div>
        <div className="stat-card premium">
          <div className="stat-icon"><DollarSign size={24} /></div>
          <div className="stat-info">
            <h3>Gross Sales</h3>
            <p className="stat-number">Rs {summary.grossSales.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card premium">
          <div className="stat-icon"><TrendingDown size={24} /></div>
          <div className="stat-info">
            <h3>Discounts</h3>
            <p className="stat-number">Rs {summary.totalDiscounts.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card premium">
          <div className="stat-icon"><DollarSign size={24} /></div>
          <div className="stat-info">
            <h3>Net Sales</h3>
            <p className="stat-number">Rs {summary.netSales.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card premium">
          <div className="stat-icon"><Receipt size={24} /></div>
          <div className="stat-info">
            <h3>Taxes</h3>
            <p className="stat-number">Rs {summary.totalTax.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card premium">
          <div className="stat-icon"><Activity size={24} /></div>
          <div className="stat-info">
            <h3>Total Returns</h3>
            <p className="stat-number">Rs {summary.totalReturns.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card premium">
          <div className="stat-icon"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <h3>AOV</h3>
            <p className="stat-number">Rs {summary.aov.toFixed(2)}</p>
          </div>
        </div>
        <div className="stat-card premium">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info">
            <h3>All-time Customers</h3>
            <p className="stat-number">{summary.allTimeCustomers}</p>
          </div>
        </div>
      </div>

      <div className="secondary-stats">
        <div className="mini-card">
          <h4>Customer Count</h4>
          <p>{summary.newCustomersCount + summary.returningCustomersCount}</p>
        </div>
        <div className="mini-card">
          <h4>New Customers</h4>
          <p>{summary.newCustomersCount}</p>
        </div>
        <div className="mini-card">
          <h4>Returning Customers</h4>
          <p>{summary.returningCustomersCount}</p>
        </div>
      </div>
    </div>
  );

  const AnalyticsView = () => (
    <div className="view-container">
      <div className="admin-charts">
        <div className="chart-container large">
          <div className="chart-header">
            <h3>Orders Trend</h3>
            <Activity size={18} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8f9fa'}} />
              <Bar dataKey="orderCount" fill="#264653" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container large">
          <div className="chart-header">
            <h3>Sales Distribution</h3>
            <TrendingUp size={18} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="totalSales" stroke="#e76f51" strokeWidth={3} dot={{r: 4, fill: '#e76f51'}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container large">
          <div className="chart-header">
            <h3>Returning Customer Rate</h3>
            <Users size={18} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} unit="%" />
              <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
              <Line type="monotone" dataKey="returningRate" stroke="#2a9d8f" strokeWidth={3} dot={{r: 4, fill: '#2a9d8f'}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const OrderAnalyticsView = () => (
    <div className="view-container">
      <div className="orders-table-container">
        <div className="chart-header">
          <h3>Top Spending Customers</h3>
          <TrendingUp size={18} />
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Total Orders</th>
              <th>Total Spend</th>
            </tr>
          </thead>
          <tbody>
            {pivotData.map((data) => (
              <tr key={data._id}>
                <td>{data.customer_name}</td>
                <td>{data.totalOrders}</td>
                <td style={{fontWeight: '600'}}>Rs {(data.totalSpend || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="orders-table-container" style={{marginTop: '30px'}}>
        <div className="chart-header">
          <h3>Product Performance</h3>
          <Activity size={18} />
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Total Orders</th>
              <th>Total Qty</th>
              <th>Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {productPerformance.map((item, idx) => (
              <tr key={idx}>
                <td>{item._id}</td>
                <td>{item.totalOrders}</td>
                <td>{item.totalQuantity}</td>
                <td style={{fontWeight: '600'}}>Rs {(item.totalRevenue || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );



  const handleAction = async (action, endpoint, body = {}) => {
    const token = localStorage.getItem("adminToken");
    try {
      const res = await fetch(`http://localhost:8080/admin-order${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      console.log(`Action Result (${action}):`, data);
      
      if (data.success || res.ok) {
        alert(`Order ${action}ed successfully`);
        fetchStats();
        // Update selected order to reflect changes if it was the one modified
        if (selectedOrder) {
            const updatedOrdersRes = await fetch(`http://localhost:8080/admin-api/analytics/detailed`, {
              headers: { "Authorization": token }
            });
            const updatedOrdersData = await updatedOrdersRes.json();
            if (updatedOrdersData.success) {
              setOrders(updatedOrdersData.orders);
              const newSelected = updatedOrdersData.orders.find(o => o.id === selectedOrder.id);
              if (newSelected) setSelectedOrder(newSelected);
            }
        }
      } else {
        const errorMsg = data.message || data.error || 'Unknown error';
        alert(`Error: ${errorMsg}`);
        console.error(`Backend error during ${action}:`, data);
      }
    } catch (err) {
      console.error(`Error during ${action}:`, err);
      alert(`Failed to ${action} order`);
    }
  };




  const handleRefundSubmit = async () => {
    if (!selectedOrder) return;

    let body = {
        type: refundType,
        note: refundNote,
        reason: 'customer'
    };

    if (refundType === 'ITEM') {
        const items = Object.entries(refundQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => ({ id, quantity: qty }));
        
        if (items.length === 0) {
            alert("Please select at least one item quantity to refund.");
            return;
        }
        body.refundItems = items;
    } else {
        if (manualRefundAmount <= 0) {
            alert("Please enter a valid refund amount.");
            return;
        }
        if (manualRefundAmount > parseFloat(selectedOrder.total_price)) {
            alert("Refund amount cannot exceed the order total.");
            return;
        }
        body.amount = manualRefundAmount;
    }

    await handleAction('refund', `/${selectedOrder.id}/refund`, body);
    setIsRefundModalOpen(false);
    // Reset modal state
    setRefundQuantities({});
    setManualRefundAmount(0);
    setRefundNote("");
  };

  const openRefundModal = (type = 'ITEM') => {
    if (!selectedOrder) return;
    // Initialize quantities to 0
    const initialQtys = {};
    selectedOrder.line_items.forEach(item => {
        initialQtys[item.id] = 0;
    });
    setRefundQuantities(initialQtys);
    setRefundType(type);
    setIsRefundModalOpen(true);
  };

  const openReturnModal = () => {
    if (!selectedOrder) return;
    const initialQtys = {};
    selectedOrder.line_items.forEach(item => {
        initialQtys[item.id] = 0;
    });
    setReturnQuantities(initialQtys);
    setReturnNote("");
    setIsReturnModalOpen(true);
  };

  const handleReturnSubmit = async () => {
    if (!selectedOrder) return;

    const items = Object.entries(returnQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, quantity: qty }));

    if (items.length === 0) {
        alert("Please select at least one item quantity to return.");
        return;
    }

    await handleAction('return', `/${selectedOrder.id}/return`, {
        returnItems: items,
        note: returnNote,
        reason: 'customer'
    });
    setIsReturnModalOpen(false);
  };




  // Navigation Lock: Prevent back button usage
  useEffect(() => {
    // Push a new state when component mounts
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (event) => {
      // Re-push state to keep user on the page
      window.history.pushState(null, '', window.location.href);
      // Optional: show a message if needed, but the prompt implies a silent lock
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div className="admin-layout">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>AdminPanel</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Home size={20} /> Dashboard
          </button>
          <button 
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={20} /> Analytics
          </button>
          <button 
            className={`nav-item dropdown-toggle ${activeTab === 'orders' || activeTab === 'detailedOrders' ? 'active' : ''}`}
            onClick={() => setIsOrdersDropdownOpen(!isOrdersDropdownOpen)}
          >
            <List size={20} /> Orders
          </button>
          {isOrdersDropdownOpen && (
            <div className="sidebar-submenu">
              <button 
                className={`submenu-item ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                Order List
              </button>
              <button 
                className={`submenu-item ${activeTab === 'detailedOrders' ? 'active' : ''}`}
                onClick={() => setActiveTab('detailedOrders')}
              >
                Detailed Orders
              </button>
            </div>
          )}
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <div className="header-left">
            <div className="header-title">
              <h1>{activeTab === 'detailedOrders' ? 'Detailed Orders' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
              <p>Welcome, {adminData?.name}</p>
            </div>
          </div>
          
          <div className="header-filters">
            <div className="date-input-group">
              <div className="input-with-label">
                <label>Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>
              <div className="input-with-label">
                <label>End Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                />
              </div>
              <button className="apply-filter-btn" onClick={fetchStats}>
                <Search size={16} /> Filter
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="loading-state">Loading data...</div>
        ) : (
          <div className="tab-content">
            {activeTab === 'home' && <HomeView />}
            {activeTab === 'analytics' && <AnalyticsView />}
            {activeTab === 'orders' && (
              <div className="orders-split-view">
                <div className="orders-list-side">
                  <div className="orders-table-container">
                    <div className="chart-header">
                      <h3>Orders</h3>
                      <List size={18} />
                    </div>
                    <table className="analytics-table clickable">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Status</th>

                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} onClick={() => setSelectedOrder(order)} className={selectedOrder?.id === order.id ? 'selected-row' : ''}>
                            <td>{order.order_number}</td>
                            <td>{order.customer?.first_name || "N/A"}</td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                            <td><span className={`status-badge ${order.financial_status}`}>{order.financial_status}</span></td>
                          </tr>

                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="order-details-side">
                  {selectedOrder ? (
                    <div className="order-detail-panel">
                      <div className="detail-header">
                        <div className="detail-title">
                          <h2>Order #{selectedOrder.order_number}</h2>
                          <p>{new Date(selectedOrder.created_at).toLocaleString()}</p>
                        </div>
                        <div className="detail-actions-central">
                          {/* Fulfill: Show if ANY line item has no fulfillment status */}
                          {!selectedOrder.cancelled_at && selectedOrder.line_items?.some(item => !item.fulfillment_status || item.fulfillment_status === 'null') && (
                            <button className="action-btn fulfill" onClick={() => handleAction('fulfill', `/admin/${selectedOrder.id}/fulfill`)}>Fulfill</button>
                          )}

                          {/* Return: Show if (fulfilled or partial) AND (paid or partially_paid) AND not cancelled */}
                          {!selectedOrder.cancelled_at && 
                           ['fulfilled', 'partial'].includes(selectedOrder.fulfillment_status) && 
                           ['paid', 'partially_paid'].includes(selectedOrder.financial_status) && (
                            <button className="action-btn return" onClick={openReturnModal}>Return</button>
                          )}





                          {/* Refund: Show if fulfilled OR (unfulfilled and paid) */}
                          {!selectedOrder.cancelled_at && (
                            selectedOrder.line_items?.some(item => item.fulfillment_status === 'fulfilled') || 
                            (selectedOrder.line_items?.some(item => !item.fulfillment_status || item.fulfillment_status === 'null') && ['paid', 'partially_paid', 'partially_refunded'].includes(selectedOrder.financial_status))
                          ) && (
                            <button className="action-btn refund" onClick={() => openRefundModal('ITEM')}>Refund</button>
                          )}


                          {/* Cancel: Show if ANY item is unfulfilled AND NONE are fulfilled */}
                          {!selectedOrder.cancelled_at && 
                            selectedOrder.line_items?.some(item => !item.fulfillment_status || item.fulfillment_status === 'null') && 
                            !selectedOrder.line_items?.some(item => item.fulfillment_status === 'fulfilled') && (
                            <button className="action-btn cancel" onClick={() => handleAction('cancel', `/${selectedOrder.id}/cancel`, { reason: 'CUSTOMER' })}>Cancel</button>
                          )}
                        </div>
                      </div>
                      
                      <div className="detail-body">
                        <div className="info-section">
                          <h4>Customer Information</h4>
                          <p><strong>Name:</strong> {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}</p>
                          <p><strong>Email:</strong> {selectedOrder.customer?.email}</p>
                        </div>
                        
                        <div className="items-section">
                          <h4>Order Items</h4>
                          <table className="items-table">
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Line Total</th>
                                <th>Discount</th>
                                <th>Tax</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedOrder.line_items?.map((item, idx) => {
                                const unitPrice = parseFloat(item.price || 0);
                                const lineTotal = item.quantity * unitPrice;
                                const itemDiscount = item.discount_allocations?.reduce((acc, d) => acc + parseFloat(d.amount || 0), 0) || 0;
                                const itemTax = item.tax_lines?.reduce((acc, t) => acc + parseFloat(t.price || 0), 0) || 0;
                                const itemTaxRate = (item.tax_lines?.[0]?.rate * 100) || 0;
                                
                                return (
                                  <tr key={idx}>
                                    <td>{item.title}</td>
                                    <td>{item.quantity}</td>
                                    <td>Rs {unitPrice.toFixed(2)}</td>
                                    <td style={{fontWeight: '600'}}>Rs {lineTotal.toFixed(2)}</td>
                                    <td className="discount-text">{itemDiscount > 0 ? `-Rs ${itemDiscount.toFixed(2)}` : "-"}</td>
                                    <td className="tax-text">{itemTax > 0 ? `+Rs ${itemTax.toFixed(2)} (${itemTaxRate}%)` : "-"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          
                          <div className="financial-summary">
                            <div className="summary-row">
                              <span>Subtotal</span>
                              <span>Rs {selectedOrder.line_items?.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0).toFixed(2)}</span>
                            </div>
                            <div className="summary-row discount">
                              <span>Discounts</span>
                              <span>- Rs {parseFloat(selectedOrder.total_discounts || 0).toFixed(2)}</span>
                            </div>
                            <div className="summary-row tax">
                              <span>Tax</span>
                              <span>+ Rs {parseFloat(selectedOrder.total_tax || 0).toFixed(2)}</span>
                            </div>
                            <div className="summary-row total">
                              <strong>Total</strong>
                              <strong>Rs {parseFloat(selectedOrder.total_price).toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Refund & Return History Section */}
                        {selectedOrder.refunds && selectedOrder.refunds.length > 0 && (
                          <div className="refund-history-section">
                            <h4>Refund & Return History</h4>
                            {selectedOrder.refunds.map((refund, ridx) => {
                              const refundAmount = refund.transactions?.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0) || 0;
                              const trackingAttr = selectedOrder.note_attributes?.find(attr => attr.name === 'Return Tracking');
                              
                              return (
                                <div key={ridx} className="refund-history-item">
                                  <div className="refund-history-header">
                                    <span className="refund-date">{new Date(refund.created_at).toLocaleDateString()}</span>
                                    <span className="refund-amount">Rs {refundAmount.toFixed(2)} Returned</span>
                                  </div>
                                  {trackingAttr && <p className="tracking-info">Tracking: #{trackingAttr.value}</p>}
                                  <div className="refund-items-mini">
                                    {refund.refund_line_items?.map((rl, lidx) => (
                                      <span key={lidx} className="mini-item-pill">
                                        {rl.line_item?.title || 'Item'} (x{rl.quantity})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="no-order-selected">
                      <ShoppingCart size={48} />
                      <p>Select an order to view details and actions</p>
                    </div>
                  )}
                </div>
              </div>
            )}
             {activeTab === 'detailedOrders' && <OrderAnalyticsView />}
          </div>
        )}
        <RefundModal 
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          selectedOrder={selectedOrder}
          refundType={refundType}
          setRefundType={setRefundType}
          refundQuantities={refundQuantities}
          setRefundQuantities={setRefundQuantities}
          manualRefundAmount={manualRefundAmount}
          setManualRefundAmount={setManualRefundAmount}
          refundNote={refundNote}
          setRefundNote={setRefundNote}
          handleRefundSubmit={handleRefundSubmit}
        />

        <ReturnModal 
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          selectedOrder={selectedOrder}
          returnQuantities={returnQuantities}
          setReturnQuantities={setReturnQuantities}
          returnNote={returnNote}
          setReturnNote={setReturnNote}
          handleReturnSubmit={handleReturnSubmit}
        />
      </main>



    </div>
  );
};

export default AdminDashboard;

// --- Separate Sub-component to prevent remounting on parent state changes ---

const RefundModal = ({ 
    isOpen, 
    onClose, 
    selectedOrder, 
    refundType, 
    setRefundType, 
    refundQuantities, 
    setRefundQuantities, 
    manualRefundAmount, 
    setManualRefundAmount, 
    refundNote, 
    setRefundNote, 
    handleRefundSubmit 
}) => {
    if (!isOpen || !selectedOrder) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-card refund-modal">
          <div className="modal-header">
            <h3>Refund Order #{selectedOrder.order_number}</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="refund-tabs">
              <button 
                className={`refund-tab-btn ${refundType === 'ITEM' ? 'active' : ''}`}
                onClick={() => setRefundType('ITEM')}
              >
                Item Return
              </button>
              <button 
                className={`refund-tab-btn ${refundType === 'MONETARY' ? 'active' : ''}`}
                onClick={() => setRefundType('MONETARY')}
              >
                Monetary Adjustment
              </button>
            </div>

            {refundType === 'ITEM' ? (
              <div className="refund-items-selection">
                <p className="helper-text">Select quantities to return to stock and refund.</p>
                <div className="refund-items-list">
                  {selectedOrder.line_items.map(item => (
                    <div className="refund-item-row" key={item.id}>
                      <div className="item-info">
                        <span className="item-title">{item.title}</span>
                        <span className="item-meta">Purchased: {item.quantity}</span>
                      </div>
                      <div className="item-qty-input">
                        <label>Refund Qty</label>
                        <input 
                          type="number" 
                          min="0" 
                          max={item.quantity} 
                          value={refundQuantities[item.id] || 0}
                          onChange={(e) => {
                            const val = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0));
                            setRefundQuantities({...refundQuantities, [item.id]: val});
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="monetary-refund-section">
                <p className="helper-text">Enter a custom amount to refund (e.g., for glitches or discounts).</p>
                <div className="input-with-label">
                  <label>Refund Amount (Rs)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max={selectedOrder.total_price}
                    value={manualRefundAmount}
                    onChange={(e) => setManualRefundAmount(parseFloat(e.target.value) || 0)}
                  />
                  <small style={{margin: '10px'}}>Max: Rs {parseFloat(selectedOrder.total_price).toLocaleString()}</small>
                </div>
              </div>
            )}

            <div className="input-with-label" style={{marginTop: '20px'}}>
              <label>Reason / Note</label>
              <textarea 
                placeholder="Ex: Damaged item, system glitch..."
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button className="cancel-btn-modal" onClick={onClose}>Cancel</button>
            <button className="submit-refund-btn" onClick={handleRefundSubmit}>
              Process {refundType === 'ITEM' ? 'Return' : 'Refund'}
            </button>
          </div>
        </div>
      </div>
    );
};

const ReturnModal = ({
    isOpen,
    onClose,
    selectedOrder,
    returnQuantities,
    setReturnQuantities,
    returnNote,
    setReturnNote,
    handleReturnSubmit
}) => {
    if (!isOpen || !selectedOrder) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-card refund-modal">
          <div className="modal-header">
            <h3 style={{margin: '15px'}}>Return Order #{selectedOrder.order_number}</h3>
            <button className="close-btn" style={{margin: '10px'}} onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="refund-items-selection">
              <p className="helper-text" style={{margin: '15px'}}>Select quantities to return and restock. (Tracking ID will be auto-generated starting at 1000)</p>
              <div className="refund-items-list">
                {selectedOrder.line_items.map(item => (
                  <div className="refund-item-row" key={item.id} style={{padding: '20px 30px'}}>
                    <div className="item-info">
                      <span className="item-title">{item.title}</span>
                      <span className="item-meta">Available: {item.quantity}</span>
                    </div>
                    <div className="item-qty-input">
                      <label>Return Qty</label>
                      <input 
                        type="number" 
                        min="0" 
                        max={item.quantity} 
                        value={returnQuantities[item.id] || 0}
                        onChange={(e) => {
                          const val = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0));
                          setReturnQuantities({...returnQuantities, [item.id]: val});
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="input-with-label" style={{marginTop: '20px'}}>
              <label>Reason / Note</label>
              <textarea 
                placeholder="Reason for return..."
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                rows={3}
                style={{borderRadius: '15px', padding: '13px'}}
              />
            </div>
          </div>

          <div className="modal-footer" style={{padding: '30px 40px'}}>
            <button className="cancel-btn-modal" onClick={onClose}>Cancel</button>
            <button className="submit-refund-btn" onClick={handleReturnSubmit}>
              Confirm Return & Restock
            </button>
          </div>
        </div>
      </div>
    );
};


