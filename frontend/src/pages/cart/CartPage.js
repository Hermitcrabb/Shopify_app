import React, { useState } from "react";
import { useCart } from "../../context/CartContext";
import { Trash2, ShoppingBag, ArrowRight, Plus, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import "../../css/CartPage.css";

const CartPage = () => {
  const {
    cart,
    removeFromCart,
    updateCartAttributes,
    applyDiscountCode,
    updateCartQuantity,
    loading,
  } = useCart();

  const [discountCode, setDiscountCode] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [updatingItems, setUpdatingItems] = useState({});

  const handleQuantityChange = async (lineId, currentQty, change) => {
    const newQty = currentQty + change;
    if (newQty < 1) return; // Can't go below 1

    setUpdatingItems((prev) => ({ ...prev, [lineId]: true }));
    try {
      await updateCartQuantity(lineId, newQty);
    } catch (error) {
      console.error("Failed to update quantity", error);
    } finally {
      setUpdatingItems((prev) => ({ ...prev, [lineId]: false }));
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setApplyingDiscount(true);
    setDiscountError("");

    try {
      const result = await applyDiscountCode(discountCode);
      if (result.userErrors && result.userErrors.length > 0) {
        setDiscountError(result.userErrors[0].message);
      } else {
        setDiscountCode("");
      }
    } catch (error) {
      setDiscountError("Failed to apply discount code");
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleSaveOrderNote = async () => {
    if (orderNote.trim()) {
      await updateCartAttributes([{ key: "order_note", value: orderNote }]);
      alert("Order note saved!");
    }
  };

  if (loading) return <div className="cart-empty">Loading cart...</div>;

  const lines = cart?.lines.edges || [];

  if (lines.length === 0) {
    return (
      <div className="cart-empty">
        <ShoppingBag size={64} />
        <h2>Your cart is empty</h2>
        <p>Looks like you haven't added anything yet.</p>
        <Link to="/home" className="continue-shopping">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Your Shopping Cart</h1>
      <div className="cart-content">
        <div className="cart-items">
          {lines.map(({ node }) => (
            <div key={node.id} className="cart-item">
              <img
                src={node.merchandise.product.featuredImage?.url}
                alt={node.merchandise.product.title}
              />
              <div className="item-details">
                <div className="item-info">
                  <h3>{node.merchandise.product.title}</h3>
                  <p className="variant-title">{node.merchandise.title}</p>
                  <p className="price-per-unit">
                    Rs{parseFloat(node.merchandise.price.amount).toFixed(2)}{" "}
                    each
                  </p>
                </div>
                <div className="item-controls">
                  {/* Quanitity Button worker */}
                  <div className="quantity-controls">
                    <button
                      onClick={() =>
                        handleQuantityChange(node.id, node.quantity, -1)
                      }
                      disabled={node.quantity <= 1 || updatingItems[node.id]}
                      className="qty-btn"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="quantity-display">
                      {updatingItems[node.id] ? "..." : node.quantity}
                    </span>
                    <button
                      onClick={() =>
                        handleQuantityChange(node.id, node.quantity, 1)
                      }
                      disabled={updatingItems[node.id]}
                      className="qty-btn"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {/* End of Quantity button worker */}

                  {/*Total price shown after quantiy update */}
                  <span className="price">
                    Rs
                    {(
                      parseFloat(node.merchandise.price.amount) * node.quantity
                    ).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(node.id)}
                    className="remove-btn"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>

          {/* Discount Code Section : ABOVE checkout button */}
          <div className="discount-section">
            <h3>Discount Code</h3>
            <div className="discount-input">
              <input
                type="text"
                placeholder="Enter discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                disabled={applyingDiscount}
              />
              <button
                onClick={handleApplyDiscount}
                disabled={applyingDiscount || !discountCode.trim()}
                className="apply-discount-btn"
              >
                {applyingDiscount ? "Applying..." : "Apply"}
              </button>
            </div>
            {discountError && <p className="error-message">{discountError}</p>}
            {cart?.discountCodes?.map((code, index) => (
              <p key={index} className="applied-discount">
                Discount applied: {code.code}
              </p>
            ))}
          </div>

          {/* Order Summary Numbers */}
          <div className="summary-row">
            <span>Subtotal</span>
            <span>Rs{parseFloat(cart.cost.totalAmount.amount).toFixed(2)}</span>
          </div>

          {/* Show discount amount if applicable */}
          {cart?.cost?.subtotalAmount &&
            cart?.cost?.totalAmount &&
            parseFloat(cart.cost.subtotalAmount.amount) >
              parseFloat(cart.cost.totalAmount.amount) && (
              <div className="summary-row discount-row">
                <span>Discount</span>
                <span className="discount-amount">
                  -Rs
                  {(
                    parseFloat(cart.cost.subtotalAmount.amount) -
                    parseFloat(cart.cost.totalAmount.amount)
                  ).toFixed(2)}
                </span>
              </div>
            )}
          {/* total price shown in the total section */}
          <div className="summary-row total">
            <span>Total</span>
            <span>
              Rs{parseFloat(cart.cost.totalAmount.amount).toFixed(2)}{" "}
              {cart.cost.totalAmount.currencyCode}
            </span>
          </div>

          <a href={cart.checkoutUrl} className="checkout-btn">
            Proceed to Checkout <ArrowRight size={18} />
          </a>

          {/* Order Notes Section - BELOW checkout button */}
          <div className="order-notes-section">
            <h3>Order Notes (Optional)</h3>
            <textarea
              placeholder="Add any special instructions or notes for your order..."
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              rows="4"
              className="order-notes-input"
            />
            <button onClick={handleSaveOrderNote} className="save-note-btn">
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
