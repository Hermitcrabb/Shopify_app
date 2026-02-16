import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { handleError, handleSuccess } from "../../utils";

function Login({ setIsAuthenticated }) {
  const [loginInfo, setLoginInfo] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(name, value);
    const copyloginInfo = { ...loginInfo };
    copyloginInfo[name] = value;
    setLoginInfo(copyloginInfo);
  };
  const handlelogin = async (e) => {
    e.preventDefault();
    const { email, password } = loginInfo;

    if (!email || !password) {
      return handleError("All fields are required!");
    }
    try {
      const url = "http://localhost:8080/auth/admin/login";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const result = await response.json();
      const { success, message, name, error } = result;
      if (success) {
        handleSuccess(message);
        localStorage.setItem("loggedInUser", name);
        setIsAuthenticated(true);
        setTimeout(() => {
          navigate("/home");
        }, 1000);
      } else if (error) {
        const details = error?.details[0].message;
        handleError(details);
      } else if (!success) {
        handleError(message);
      }
      console.log(result);
    } catch (err) {
      handleError(err);
    }
  };
  console.log("loginInfo ->", loginInfo);
  return (
    <>
      <div className="container">
        <h1>Login</h1>
        <form onSubmit={handlelogin}>
          <div>
            <label htmlFor="email">Email </label>
            <input
              onChange={handleChange}
              type="text"
              name="email"
              autoFocus
              placeholder="Enter your email... "
              value={loginInfo.email}
              required
            ></input>
          </div>

          <div>
            <label htmlFor="password">Password </label>
            <input
              onChange={handleChange}
              type="password"
              name="password"
              autoFocus
              placeholder="Enter your password.. "
              value={loginInfo.password}
              required
            ></input>
          </div>
          <button type="submit"> Login</button>
          <span>
            Don't have an account?
            <Link to="/signup">Signup</Link>
          </span>
        </form>
        <ToastContainer></ToastContainer>
      </div>
    </>
  );
}

export default Login;
