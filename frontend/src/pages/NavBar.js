// import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import "../css/NavBar.css";
import { useAuth } from "../auth/AuthContext";

function NavBar() {
  const { cartCount } = useCart();
  const { customer, isAuthenticated, logout } = useAuth();

  return (
    <nav className="custom-navbar">
      <div className="nav-container">
        <Link className="nav-logo" to="/home">
          <ShoppingBag size={28} />
          <span>STOREFRONT</span>
        </Link>

        <div className="nav-links">
          <Link className="nav-link" to="/home">
            Home
          </Link>
          <Link className="nav-cart" to="/cart">
            <ShoppingCart size={24} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
        </div>
        <div className="nav-logs">
          {isAuthenticated && customer ? (
            <div className="nav-user">
              <span className="nav-username">
                {customer.firstName || customer.email.split("@")[0]}
              </span>

              <div className="nav-dropdown">
                <Link to="/profile">Profile</Link>
                <button onClick={logout}>Logout</button>
              </div>
            </div>
          ) : (
            <div className="nav-auth">
              <Link className="nav-login" to="/login">
                Login
              </Link>
              <Link className="nav-signup" to="/signup">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
