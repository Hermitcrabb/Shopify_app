import "./css/App.css";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import NavBar from "./pages/NavBar";
import CartPage from "./pages/cart/CartPage";
import { CartProvider } from "./context/CartContext";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/SignUp";
import ProductPage from "./components/ProductPage";
import ProtectedRoute from "./auth/ProtectedRoute";
import ProfilePage from "./pages/profile/Profile";
import AdminLogin from "./pages/adminauth/AdminLogin";
import AdminSignup from "./pages/adminauth/AdminSignup";
import ProtectedAdminRoute from "./auth/ProctectedAdminRoute";
import AdminDashboard from "./pages/dashboard/Dashboard";
import OrdersDashboard from "./pages/dashboard/OrdersDashboard";

function App() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <CartProvider>
      {!isAdminPage && <NavBar />}
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<Home />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/product/:handle" element={<ProductPage />} />
          <Route path="*" element={<Navigate to="/home" />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedAdminRoute>
                <OrdersDashboard />
              </ProtectedAdminRoute>
            }
          />
        </Routes>
      </div>
    </CartProvider>
  );
}

export default App;
