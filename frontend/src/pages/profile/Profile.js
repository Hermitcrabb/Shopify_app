import React, { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { Package, MapPin, Lock } from "lucide-react";
import shopifyClient from "../../utils/shopify";
import "../../css/Profile.css";

// GraphQL queries
const GET_CUSTOMER_ORDERS = `
  query getCustomerOrders($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      orders(first: 10, reverse: true) {
        edges {
          node {
            id
            orderNumber
            processedAt
            totalPrice {
              amount
              currencyCode
            }
            fulfillmentStatus
            financialStatus
            lineItems(first: 5) {
              edges {
                node {
                  title
                  quantity
                  variant {
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const GET_CUSTOMER_ADDRESSES = `
  query getCustomerAddresses($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      addresses(first: 10) {
        edges {
          node {
            id
            firstName
            lastName
            address1
            address2
            city
            province
            zip
            country
            phone
          }
        }
      }
      defaultAddress {
        id
      }
    }
  }
`;

const UPDATE_CUSTOMER = `
  mutation customerUpdate($customer: CustomerUpdateInput!, $customerAccessToken: String!) {
    customerUpdate(customer: $customer, customerAccessToken: $customerAccessToken) {
      customer {
        firstName
        lastName
        email
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UPDATE_CUSTOMER_ADDRESS = `
  mutation customerAddressUpdate($address: MailingAddressInput!, $customerAccessToken: String!, $id: ID!) {
    customerAddressUpdate(address: $address, customerAccessToken: $customerAccessToken, id: $id) {
      customerAddress {
        id
        firstName
        lastName
        address1
        city
        province
        zip
        country
        phone
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_CUSTOMER_ADDRESS = `
  mutation customerAddressCreate($address: MailingAddressInput!, $customerAccessToken: String!) {
    customerAddressCreate(address: $address, customerAccessToken: $customerAccessToken) {
      customerAddress {
        id
        firstName
        lastName
        address1
        city
        province
        zip
        country
        phone
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const ProfilePage = () => {
  const { customer } = useAuth();
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [defaultAddressId, setDefaultAddressId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Address form state
  const [addressForm, setAddressForm] = useState({
    id: null,
    firstName: customer?.firstName || "",
    lastName: customer?.lastName || "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    country: "NP",
    phone: "",
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Fetch orders and addresses on component mount
  useEffect(() => {
    if (customer) {
      fetchCustomerData();
    }
  }, [customer]);

  const fetchCustomerData = async () => {
    setLoading(true);
    const token = localStorage.getItem("customerToken");

    try {
      // Fetch orders
      const ordersData = await shopifyClient(GET_CUSTOMER_ORDERS, {
        customerAccessToken: token,
      });
      if (ordersData.customer?.orders?.edges) {
        setOrders(ordersData.customer.orders.edges.map((edge) => edge.node));
      }

      // Fetch addresses
      const addressesData = await shopifyClient(GET_CUSTOMER_ADDRESSES, {
        customerAccessToken: token,
      });
      if (addressesData.customer?.addresses?.edges) {
        setAddresses(
          addressesData.customer.addresses.edges.map((edge) => edge.node),
        );
        setDefaultAddressId(addressesData.customer.defaultAddress?.id);

        // If there's a default address, pre-fill the form
        const defaultAddress = addressesData.customer.addresses.edges.find(
          (edge) => edge.node.id === addressesData.customer.defaultAddress?.id,
        );
        if (defaultAddress) {
          setAddressForm({
            id: defaultAddress.node.id,
            firstName: defaultAddress.node.firstName,
            lastName: defaultAddress.node.lastName,
            address1: defaultAddress.node.address1,
            address2: defaultAddress.node.address2 || "",
            city: defaultAddress.node.city,
            province: defaultAddress.node.province,
            zip: defaultAddress.node.zip,
            country: defaultAddress.node.country,
            phone: defaultAddress.node.phone || "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch customer data:", error);
      setMessage({ type: "error", text: "Failed to load profile data" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem("customerToken");

    try {
      let result;
      const addressData = {
        firstName: addressForm.firstName,
        lastName: addressForm.lastName,
        address1: addressForm.address1,
        address2: addressForm.address2,
        city: addressForm.city,
        province: addressForm.province,
        zip: addressForm.zip,
        country: addressForm.country,
        phone: addressForm.phone,
      };

      if (addressForm.id) {
        // Update existing address
        result = await shopifyClient(UPDATE_CUSTOMER_ADDRESS, {
          id: addressForm.id,
          address: addressData,
          customerAccessToken: token,
        });
      } else {
        // Create new address
        result = await shopifyClient(CREATE_CUSTOMER_ADDRESS, {
          address: addressData,
          customerAccessToken: token,
        });
      }

      if (result.userErrors && result.userErrors.length > 0) {
        setMessage({ type: "error", text: result.userErrors[0].message });
      } else {
        setMessage({
          type: "success",
          text: addressForm.id
            ? "Address updated successfully!"
            : "Address added successfully!",
        });
        fetchCustomerData(); // Refresh data
      }
    } catch (error) {
      console.error("Address update failed:", error);
      setMessage({ type: "error", text: "Failed to save address" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters",
      });
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("customerToken");

    try {
      const result = await shopifyClient(UPDATE_CUSTOMER, {
        customer: {
          password: passwordForm.newPassword,
        },
        customerAccessToken: token,
      });

      if (result.userErrors && result.userErrors.length > 0) {
        setMessage({ type: "error", text: result.userErrors[0].message });
      } else {
        setMessage({ type: "success", text: "Password changed successfully!" });
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      console.error("Password change failed:", error);
      setMessage({ type: "error", text: "Failed to change password" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const selectAddress = (address) => {
    setAddressForm({
      id: address.id,
      firstName: address.firstName,
      lastName: address.lastName,
      address1: address.address1,
      address2: address.address2 || "",
      city: address.city,
      province: address.province,
      zip: address.zip,
      country: address.country,
      phone: address.phone || "",
    });
  };

  const addNewAddress = () => {
    setAddressForm({
      id: null,
      firstName: customer?.firstName || "",
      lastName: customer?.lastName || "",
      address1: "",
      address2: "",
      city: "",
      province: "",
      zip: "",
      country: "NP",
      phone: "",
    });
  };

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-info">
          <h1>
            {customer?.firstName} {customer?.lastName}
          </h1>
          <p>{customer?.email}</p>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: "", text: "" })}>×</button>
        </div>
      )}

      {/* Main Content */}
      <div className="profile-content">
        {/* Sidebar Navigation */}
        <div className="profile-sidebar">
          <button
            className={`sidebar-tab ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <Package size={20} />
            <span>My Orders</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === "address" ? "active" : ""}`}
            onClick={() => setActiveTab("address")}
          >
            <MapPin size={20} />
            <span>Address</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === "password" ? "active" : ""}`}
            onClick={() => setActiveTab("password")}
          >
            <Lock size={20} />
            <span>Change Password</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="profile-main">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <>
              {/* Orders Tab */}
              {activeTab === "orders" && (
                <div className="tab-content orders-tab">
                  <h2>My Orders</h2>
                  {orders.length > 0 ? (
                    <div className="orders-list">
                      {orders.map((order) => (
                        <div key={order.id} className="order-card">
                          <div className="order-header">
                            <div>
                              <h3>Order #{order.orderNumber}</h3>
                              <p className="order-date">
                                {formatDate(order.processedAt)}
                              </p>
                            </div>
                            <span
                              className={`order-status ${order.fulfillmentStatus?.toLowerCase() || "pending"}`}
                            >
                              {order.fulfillmentStatus || "Pending"}
                            </span>
                          </div>
                          <div className="order-items">
                            {order.lineItems.edges.map((item, index) => (
                              <div key={index} className="order-item">
                                <span className="item-name">
                                  {item.node.title} × {item.node.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="order-footer">
                            <div className="order-total">
                              Total: Rs
                              {parseFloat(order.totalPrice.amount).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Package size={64} />
                      <h3>No orders yet</h3>
                      <p>Your order history will appear here</p>
                    </div>
                  )}
                </div>
              )}

              {/* Address Tab */}
              {activeTab === "address" && (
                <div className="tab-content address-tab">
                  <h2>Manage Addresses</h2>

                  {/* Address List */}
                  {addresses.length > 0 && (
                    <div className="addresses-list">
                      {addresses.map((address) => (
                        <div
                          key={address.id}
                          className={`address-card ${address.id === defaultAddressId ? "default" : ""} ${address.id === addressForm.id ? "selected" : ""}`}
                          onClick={() => selectAddress(address)}
                        >
                          <div className="address-content">
                            <h4>
                              {address.firstName} {address.lastName}
                            </h4>
                            <p>{address.address1}</p>
                            {address.address2 && <p>{address.address2}</p>}
                            <p>
                              {address.city}, {address.province} {address.zip}
                            </p>
                            <p>{address.country}</p>
                            {address.phone && <p>Phone: {address.phone}</p>}
                          </div>
                          {address.id === defaultAddressId && (
                            <span className="default-badge">Default</span>
                          )}
                        </div>
                      ))}
                      <div
                        className="address-card new-address"
                        onClick={addNewAddress}
                      >
                        <div className="address-content">
                          <h4>+ Add New Address</h4>
                          <p>Click to add a new shipping address</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Address Form */}
                  <form onSubmit={handleAddressSubmit} className="address-form">
                    <h3>
                      {addressForm.id ? "Edit Address" : "Add New Address"}
                    </h3>

                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          value={addressForm.firstName}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              firstName: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          value={addressForm.lastName}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              lastName: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Address Line 1 *</label>
                      <input
                        type="text"
                        value={addressForm.address1}
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            address1: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        value={addressForm.address2}
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            address2: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>City *</label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              city: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Province *</label>
                        <input
                          type="text"
                          value={addressForm.province}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              province: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>ZIP Code *</label>
                        <input
                          type="text"
                          value={addressForm.zip}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              zip: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Country *</label>
                        <select
                          value={addressForm.country}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              country: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="NP">Nepal</option>
                          <option value="IN">India</option>
                          <option value="US">United States</option>
                          <option value="UK">United Kingdom</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input
                          type="tel"
                          value={addressForm.phone}
                          onChange={(e) => {
                            // Remove non-numeric characters and limit to 10 digits
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10);
                            setAddressForm({
                              ...addressForm,
                              phone: value,
                            });
                          }}
                          placeholder="98XXXXXXXX"
                          pattern="[0-9]{10}"
                          title="Please enter exactly 10 digits"
                        />
                        {addressForm.phone &&
                          addressForm.phone.length !== 10 && (
                            <p className="validation-error">
                              Phone number must be exactly 10 digits
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="save-btn"
                        disabled={loading}
                      >
                        {loading
                          ? "Saving..."
                          : addressForm.id
                            ? "Update Address"
                            : "Add Address"}
                      </button>
                      {addressForm.id && (
                        <button
                          type="button"
                          className="cancel-btn"
                          onClick={addNewAddress}
                        >
                          Add New Instead
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* Change Password Tab */}
              {activeTab === "password" && (
                <div className="tab-content password-tab">
                  <h2>Change Password</h2>
                  <form
                    onSubmit={handlePasswordChange}
                    className="password-form"
                  >
                    <div className="form-group">
                      <label>Current Password *</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>New Password *</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                        required
                      />
                      <p className="password-hint">Minimum 8 characters</p>
                    </div>

                    <div className="form-group">
                      <label>Confirm New Password *</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="change-password-btn"
                        disabled={loading}
                      >
                        {loading ? "Changing..." : "Change Password"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
