// pages/admin/AdminLogin.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { handleError, handleSuccess } from "../../utils";
import "../../css/AdminAuth.css";

function AdminLogin() {
  const [loginInfo, setLoginInfo] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { email, password } = loginInfo;

    if (!email || !password) {
      return handleError("All fields are required!");
    }

    setLoading(true);

    try {
      const url = "http://localhost:8080/admin/login";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.token && result.success) {
        handleSuccess(result.message);
        localStorage.setItem("adminToken", result.token);
        localStorage.setItem("adminName", result.name);
        localStorage.setItem("adminEmail", result.email);

        console.log("Token saved:", result.token);
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 1000);
      } else {
        handleError(result.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      handleError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Admin Login</h1>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              onChange={handleChange}
              type="email"
              name="email"
              placeholder="admin@example.com"
              value={loginInfo.email}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              onChange={handleChange}
              type="password"
              name="password"
              placeholder="Enter your password"
              value={loginInfo.password}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="auth-links">
            <span>
              Don't have an account? <Link to="/admin/signup">Signup</Link>
            </span>
            <Link to="/login" className="user-login-link">
              User Login
            </Link>
          </div>
        </form>
      </div>
      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}

export default AdminLogin;
