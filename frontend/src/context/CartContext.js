import React, { createContext, useContext, useState, useEffect } from "react";
import shopifyClient from "../utils/shopify";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const CART_FIELDS = `
    id
    checkoutUrl
    lines(first: 10) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              price {
                amount
                currencyCode
              }
              product {
                title
                featuredImage {
                  url
                }
              }
            }
          }
        }
      }
    }
    cost {
      totalAmount {
        amount
        currencyCode
      }
      subtotalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
      totalDutyAmount {
        amount
        currencyCode
      }
    }
    discountCodes {
      code
      applicable
    }
  `;

  const CREATE_CART_MUTATION = `
    mutation cartCreate($input: CartInput) {
      cartCreate(input: $input) {
        cart {
          ${CART_FIELDS}
        }
      }
    }
  `;

  const GET_CART_QUERY = `
    query getCart($id: ID!) {
      cart(id: $id) {
        ${CART_FIELDS}
      }
    }
  `;

  const ADD_TO_CART_MUTATION = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          ${CART_FIELDS}
        }
      }
    }
  `;

  const REMOVE_FROM_CART_MUTATION = `
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ${CART_FIELDS}
      }
    }
  }
`;

  //Add notes that user wants in the check out page
  const UPDATE_CART_ATTRIBUTES_MUTATION = `
  mutation cartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart {
        id
        attributes {
          key
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

  // applies discount code to the total price at the end.
  const APPLY_DISCOUNT_MUTATION = `
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ${CART_FIELDS}
      }
      userErrors {
        field
        message
      }
    }
  }
`;

  //quntatity updater in cart page
  const UPDATE_CART_MUTATION = `
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ${CART_FIELDS}
      }
      userErrors {
        field
        message
      }
    }
  }
`;

  useEffect(() => {
    const fetchCart = async () => {
      const savedCartId = localStorage.getItem("shopify_cart_id");
      if (savedCartId) {
        try {
          const data = await shopifyClient(GET_CART_QUERY, { id: savedCartId });
          if (data.cart) {
            setCart(data.cart);
          } else {
            localStorage.removeItem("shopify_cart_id");
          }
        } catch (error) {
          console.error("Failed to fetch cart", error);
        }
      }
      setLoading(false);
    };
    fetchCart();
  }, []);

  const addToCart = async (variantId, quantity = 1) => {
    try {
      let currentCartId = cart?.id || localStorage.getItem("shopify_cart_id");

      if (!currentCartId) {
        const data = await shopifyClient(CREATE_CART_MUTATION, {
          input: {
            lines: [{ merchandiseId: variantId, quantity }],
          },
        });
        const newCart = data.cartCreate.cart;
        setCart(newCart);
        localStorage.setItem("shopify_cart_id", newCart.id);
      } else {
        const data = await shopifyClient(ADD_TO_CART_MUTATION, {
          cartId: currentCartId,
          lines: [{ merchandiseId: variantId, quantity }],
        });
        setCart(data.cartLinesAdd.cart);
        localStorage.setItem("shopify_cart_id", data.cartLinesAdd.cart.id);
      }
    } catch (error) {
      console.error("Add to cart failed", error);
      throw error;
    }
  };

  const removeFromCart = async (lineId) => {
    try {
      if (!cart?.id) return;
      const data = await shopifyClient(REMOVE_FROM_CART_MUTATION, {
        cartId: cart.id,
        lineIds: [lineId],
      });
      setCart(data.cartLinesRemove.cart);
    } catch (error) {
      console.error("Remove from cart failed", error);
    }
  };

  const updateCartAttributes = async (attributes) => {
    try {
      if (!cart?.id) return;
      const data = await shopifyClient(UPDATE_CART_ATTRIBUTES_MUTATION, {
        cartId: cart.id,
        attributes,
      });
      setCart((prev) => ({
        ...prev,
        attributes: data.cartAttributesUpdate.cart.attributes,
      }));
    } catch (error) {
      console.error("Update cart attributes failed", error);
    }
  };

  const applyDiscountCode = async (discountCode) => {
    try {
      if (!cart?.id) return;
      const data = await shopifyClient(APPLY_DISCOUNT_MUTATION, {
        cartId: cart.id,
        discountCodes: [discountCode],
      });
      setCart(data.cartDiscountCodesUpdate.cart);
      return data.cartDiscountCodesUpdate;
    } catch (error) {
      console.error("Apply discount failed", error);
      throw error;
    }
  };

  const updateCartQuantity = async (lineId, quantity) => {
    try {
      if (!cart?.id) return;
      const data = await shopifyClient(UPDATE_CART_MUTATION, {
        cartId: cart.id,
        lines: [{ id: lineId, quantity }],
      });
      setCart(data.cartLinesUpdate.cart);
    } catch (error) {
      console.error("Update cart quantity failed", error);
      throw error;
    }
  };

  const cartCount =
    cart?.lines?.edges?.reduce((acc, edge) => acc + edge.node.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        cartCount,
        updateCartAttributes,
        applyDiscountCode,
        updateCartQuantity,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
