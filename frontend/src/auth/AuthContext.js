import { createContext, useContext, useEffect, useState } from "react";
import shopifyClient, {
  CUSTOMER_ACTIVATE,
  CUSTOMER_CREATE,
  CUSTOMER_LOGIN,
  GET_CUSTOMER,
} from "../utils/shopify";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  //Saving the authtoken in localStorage

  const saveToken = (token, expiry) => {
    localStorage.setItem("customerToken", token);
    localStorage.setItem("customerTokenExpiry", expiry);
  };

  //deleting the token afte expiry or logging out

  const clearToken = () => {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerTokenExpiry");
    setCustomer(null);
  };

  //Session Management on Token based controll

  const autoLogin = async () => {
    const token = localStorage.getItem("customerToken");
    const expiry = localStorage.getItem("customerTokenExpiry");

    if (!token || !expiry || new Date(expiry) <= new Date()) {
      clearToken();
      setLoading(false);
      return;
    }
    try {
      const data = await shopifyClient(GET_CUSTOMER, { token });
      setCustomer(data.customer);
    } catch (err) {
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  //signup creation using graphql mutation customer_create

  const signup = async (input) => {
    const { firstName, lastName, email, password } = input;
    const data = await shopifyClient(CUSTOMER_CREATE, {
      input: {
        firstName,
        lastName,
        email,
        password,
      },
    }); // yeta bata continue garna cha
    const error = data.customerCreate.customerUserErrors;
    if (error.length) throw new Error(error[0].message);
    return data.customerCreate.customer.id;
  };

  //login of user, validation using customer_login and get_user

  const login = async (email, password) => {
    const data = await shopifyClient(CUSTOMER_LOGIN, {
      input: { email, password },
    });

    const error = data.customerAccessTokenCreate.customerUserErrors;

    if (error.length) throw new Error(error[0].message);

    const { accessToken, expiresAt } =
      data.customerAccessTokenCreate.customerAccessToken;

    saveToken(accessToken, expiresAt);
    await autoLogin();
  };

  const activateAccount = async (id, password) => {
    const input = { password, passwordConfirmation: password };
    const data = await shopifyClient(CUSTOMER_ACTIVATE, { id, input });

    const error = data.customerCreate.customerUserErrors;
    if (error.length) throw new Error(error[0].message);
    const tokenData = data.customerActivate.customerAccessToken;

    localStorage.setItem("customerToken", tokenData.accessToken);
    localStorage.setItem("customerTokenExpiry", tokenData.expiresAt);

    return data.customerActivate.customer;
  };

  //logout button and clearing the saved tokens

  const logout = () => {
    clearToken();
  };

  useEffect(() => {
    autoLogin();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        customer,
        loading,
        signup,
        activateAccount,
        login,
        logout,
        isAuthenticated: !!customer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider!");
  return ctx;
};
