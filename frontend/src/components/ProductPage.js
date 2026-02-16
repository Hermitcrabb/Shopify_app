import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import shopifyClient from "../utils/shopify";
import "../css/ProductPage.css";

const GET_PRODUCT_QUERY = `
  query getProduct($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      description
      featuredImage {
        url
        altText
      }
      images(first: 5) {
        edges {
          node {
            url
            altText
          }
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            availableForSale
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

const ProductPage = () => {
  const { handle } = useParams(); // product handle from URL
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await shopifyClient(GET_PRODUCT_QUERY, { handle });
        setProduct(data.productByHandle);
        // Set first variant as default
        if (data.productByHandle.variants.edges.length > 0) {
          setSelectedVariant(data.productByHandle.variants.edges[0].node);
        }
      } catch (error) {
        console.error("Failed to fetch product", error);
        navigate("/home");
      } finally {
        setLoading(false);
      }
    };

    if (handle) {
      fetchProduct();
    }
  }, [handle, navigate]);

  const handleQuantityChange = (change) => {
    const newQty = quantity + change;
    if (newQty >= 1) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    setAddingToCart(true);
    try {
      await addToCart(selectedVariant.id, quantity);
      // Optional: Show success message
      alert("Added to cart!");
    } catch (error) {
      console.error("Failed to add to cart", error);
      alert("Failed to add to cart. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant) return;

    setAddingToCart(true);
    try {
      await addToCart(selectedVariant.id, quantity);
      // Redirect to cart page immediately
      navigate("/cart");
    } catch (error) {
      console.error("Failed to add to cart", error);
      alert("Failed to add to cart. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return <div className="product-loading">Loading product...</div>;
  }

  if (!product) {
    return <div className="product-not-found">Product not found</div>;
  }

  const mainImage =
    product.featuredImage?.url ||
    (product.images.edges.length > 0 ? product.images.edges[0].node.url : "");

  return (
    <div className="product-page">
      <button onClick={() => navigate(-1)} className="back-button">
        <ArrowLeft size={20} /> Back to Products
      </button>

      <div className="product-container">
        {/* Product Images */}
        <div className="product-images">
          <div className="main-image">
            <img src={mainImage} alt={product.title} />
          </div>
          <div className="thumbnail-images">
            {product.images.edges.map(({ node }, index) => (
              <div key={index} className="thumbnail">
                <img
                  src={node.url}
                  alt={node.altText || `Product image ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Product Details */}
        <div className="product-details">
          <h1 className="product-title">{product.title}</h1>

          <div className="product-price">
            <span className="price-amount">
              Rs
              {parseFloat(
                selectedVariant?.price.amount ||
                  product.priceRange.minVariantPrice.amount,
              ).toFixed(2)}
            </span>
            {product.priceRange.minVariantPrice.amount !==
              product.priceRange.maxVariantPrice.amount && (
              <span className="price-range">
                - Rs
                {parseFloat(product.priceRange.maxVariantPrice.amount).toFixed(
                  2,
                )}
              </span>
            )}
          </div>

          <div
            className="product-description"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />

          {/* Variant Selector (if multiple variants) */}
          {product.variants.edges.length > 1 && (
            <div className="variant-selector">
              <h3>Options</h3>
              <div className="variant-options">
                {product.variants.edges.map(({ node }) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedVariant(node)}
                    className={`variant-btn ${selectedVariant?.id === node.id ? "active" : ""} ${!node.availableForSale ? "out-of-stock" : ""}`}
                    disabled={!node.availableForSale}
                  >
                    {node.title}
                    {!node.availableForSale && (
                      <span className="stock-label">Out of stock</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="quantity-selector">
            <h3>Quantity</h3>
            <div className="quantity-controls">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="qty-btn"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="quantity-input"
              />
              <button
                onClick={() => handleQuantityChange(1)}
                className="qty-btn"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant?.availableForSale || addingToCart}
              className="add-to-cart-btn"
            >
              <ShoppingBag size={20} />
              {addingToCart ? "Adding..." : "Add to Cart"}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={!selectedVariant?.availableForSale || addingToCart}
              className="buy-now-btn"
            >
              {addingToCart ? "Processing..." : "Buy it Now"}
            </button>
          </div>

          {/* Stock Status */}
          {!selectedVariant?.availableForSale && (
            <p className="out-of-stock-message">
              This product is currently out of stock
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
