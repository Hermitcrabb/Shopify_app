import axios from "axios";

const domain = process.env.REACT_APP_SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken =
  process.env.REACT_APP_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

// customer signup data posted to shopify database
export const CUSTOMER_CREATE = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        firstName
        lastName
        email
      }
      customerUserErrors {
        message
      }
    }
  }
`;

// customer login using graphql to post on shopify database
export const CUSTOMER_LOGIN = `
  mutation customerAccessTokenCreate(
    $input: CustomerAccessTokenCreateInput!
  ) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        message
      }
    }
  }
`;

export const CUSTOMER_ACTIVATE = `
  mutation customerActivate($id: ID!, $input: CustomerActivateInput!) {
  customerActivate(id: $id, input: $input) {
    customer {
      id
      firstName
      lastName
      email
    }
    customerAccessToken {
      accessToken
      expiresAt
    }
    customerUserErrors {
      message
    }
  }
}
`;

//Session management for user that have looged in the system and have accessToken
export const GET_CUSTOMER = `
  query getCustomer($token: String!) {
    customer(customerAccessToken: $token) {
      id
      firstName
      lastName
      email
    }
  }
`;

export const UPDATE_CUSTOMER = `
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
}`;

export const UPDATE_CUSTOMER_PASSWORD = `
mutation customerUpdate($customer: CustomerUpdateInput!, $customerAccessToken: String!) {
  customerUpdate(customer: $customer, customerAccessToken: $customerAccessToken) {
    customer {
      id
    }
    userErrors {
      field
      message
    }
  }
};`;

export const GET_CUSTOMER_ORDER = `
  query getCustomerOrders($customerAccessToken: String!) {
  customer(customerAccessToken: $customerAccessToken) {
    orders(first: 10) {
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
              }
            }
          }
        }
      }
    }
  }
}
`;

const shopifyClient = async (query, variables = {}) => {
  const url = `https://${domain}/api/2024-01/graphql.json`;

  try {
    const response = await axios({
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
      },
      data: {
        query,
        variables,
      },
    });

    if (response.data.errors) {
      console.error("Shopify API Errors:", response.data.errors);
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data;
  } catch (error) {
    console.error("Shopify Client Error:", error);
    throw error;
  }
};

export default shopifyClient;
