import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function RefreshHandler({ setIsAuthenticated }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("http://localhost:8080/auth/check", {
          method: "GET",
          credentials: "include", // Important: sends httpOnly cookies
        });

        if (response.ok) {
          setIsAuthenticated(true);

          // If authenticated and on login/signup pages, redirect to home
          if (
            location.pathname === "/" ||
            location.pathname === "/login" ||
            location.pathname === "/signup"
          ) {
            navigate("/home", { replace: true });
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [location, navigate, setIsAuthenticated]);

  return null;
}
