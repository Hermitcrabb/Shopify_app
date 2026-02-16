// pages/admin/AdminSignup.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { handleError, handleSuccess } from "../../utils";
import "../../css/AdminAuth.css";

function AdminSignup() {
  const [signupInfo, setSignupInfo] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSignupInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const { name, email, password } = signupInfo;

    if (!name || !email || !password) {
      return handleError("All fields are required!");
    }

    if (password.length < 6) {
      return handleError("Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      const url = "http://localhost:8080/admin/signup";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        handleSuccess(result.message);
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 1000);
      } else {
        handleError(result.message || "Signup failed");
      }
    } catch (err) {
      console.error("Signup error:", err);
      handleError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Admin Signup</h1>
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              onChange={handleChange}
              type="text"
              name="name"
              placeholder="Enter your name"
              value={signupInfo.name}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              onChange={handleChange}
              type="email"
              name="email"
              placeholder="admin@example.com"
              value={signupInfo.email}
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
              placeholder="Minimum 6 characters"
              value={signupInfo.password}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "Creating account..." : "Signup"}
          </button>

          <div className="auth-links">
            <span>
              Already have an account? <Link to="/admin/login">Login</Link>
            </span>
            <Link to="/signup" className="user-signup-link">
              User Signup
            </Link>
          </div>
        </form>
      </div>
      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}

export default AdminSignup;
