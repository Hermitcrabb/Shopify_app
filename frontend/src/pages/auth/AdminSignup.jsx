import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { handleError, handleSuccess } from "../../utils";

function Signup() {
  const [signupInfo, setSignupInfo] = useState({
    name: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(name, value);
    const copySignupInfo = { ...signupInfo };
    copySignupInfo[name] = value;
    setSignupInfo(copySignupInfo);
  };
  const handleSignup = async (e) => {
    e.preventDefault();
    const { name, email, password } = signupInfo;

    if (!name || !email || !password) {
      return handleError("All fields are required!");
    }
    try {
      const url = "http://localhost:8080/auth/admin/signup";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
        credentials: "include",
      });
      const result = await response.json();
      const { success, message, error } = result;
      if (success) {
        handleSuccess(message);
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
  console.log("loginInfo ->", signupInfo);
  return (
    <>
      <div className="container">
        <h1>Signup</h1>
        <form onSubmit={handleSignup}>
          <div>
            <label htmlFor="name">Name </label>
            <input
              onChange={handleChange}
              type="text"
              name="name"
              autoFocus
              placeholder="Enter your name..."
              value={signupInfo.name}
              required
            ></input>
          </div>

          <div>
            <label htmlFor="email">Email </label>
            <input
              onChange={handleChange}
              type="text"
              name="email"
              autoFocus
              placeholder="Enter your email... "
              value={signupInfo.email}
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
              value={signupInfo.password}
              required
            ></input>
          </div>
          <button type="submit"> Signup</button>
          <span>
            Already have an account?
            <Link to="/login">Login</Link>
          </span>
        </form>
        <ToastContainer></ToastContainer>
      </div>
    </>
  );
}

export default Signup;
