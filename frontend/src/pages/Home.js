import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import shopifyClient from "../utils/shopify";
import ProductCard from "../components/ProductCard";
import "../css/Home.css";
import { useCart } from "../context/CartContext";

function Home() {
  const [products, setProducts] = useState([]);
  const [latestProducts, setLatestProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sliderLoading, setSliderLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { addToCart } = useCart();

  // Query for all products (existing)
  const GET_PRODUCTS_QUERY = `
    query getProducts {
      products(first: 20) {
        edges {
          node {
            id
            title
            handle
            description
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  // Query for latest arrivals (slider)
  const GET_LATEST_PRODUCTS_QUERY = `
    query getLatestProducts($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  useEffect(() => {
    fetchAllProducts();
    fetchLatestProducts();
  }, []);

  const fetchAllProducts = async () => {
    try {
      const data = await shopifyClient(GET_PRODUCTS_QUERY);
      setProducts(data.products.edges.map((edge) => edge.node));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Failed to load products. Check your Shopify credentials.");
      setLoading(false);
    }
  };

  const fetchLatestProducts = async () => {
    try {
      const data = await shopifyClient(GET_LATEST_PRODUCTS_QUERY, {
        first: 8, // Get 8 latest products for slider
      });
      setLatestProducts(data.products.edges.map((edge) => edge.node));
      setSliderLoading(false);
    } catch (error) {
      console.error("Failed to fetch latest products", error);
      setSliderLoading(false);
    }
  };

  const handleAddToCart = async (variantId) => {
    try {
      await addToCart(variantId);
      toast.success("Added to cart!");
    } catch (err) {
      toast.error("Failed to add to cart.");
    }
  };

  const nextSlide = () => {
    if (latestProducts.length === 0) return;
    const maxSlides = Math.ceil(latestProducts.length / 4);
    setCurrentSlide((prev) => (prev === maxSlides - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    if (latestProducts.length === 0) return;
    const maxSlides = Math.ceil(latestProducts.length / 4);
    setCurrentSlide((prev) => (prev === 0 ? maxSlides - 1 : prev - 1));
  };

  // Auto slide every 5 seconds
  useEffect(() => {
    if (latestProducts.length > 0) {
      const interval = setInterval(() => {
        nextSlide();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [latestProducts, currentSlide]);

  return (
    <div>
      {/* Latest Arrivals Slider */}
      {!sliderLoading && latestProducts.length > 0 && (
        <section className="latest-arrivals-section">
          <div className="section-header">
            <h2>Latest Arrivals</h2>
            <p>Fresh picks just for you</p>
          </div>

          <div className="slider-container">
            <button className="slider-btn prev-btn" onClick={prevSlide}>
              <ChevronLeft size={24} />
            </button>

            <div className="slider-wrapper">
              <div
                className="slider-track"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`,
                }}
              >
                {latestProducts.map((product) => (
                  <div key={product.id} className="slider-item">
                    <Link
                      to={`/product/${product.handle}`}
                      className="product-slide-link"
                    >
                      <div className="slide-image">
                        <img
                          src={product.featuredImage?.url || "/placeholder.jpg"}
                          alt={product.featuredImage?.altText || product.title}
                        />
                        <div className="slide-overlay">
                          <span className="view-product">View Product</span>
                        </div>
                      </div>
                      <div className="slide-info">
                        <h3>{product.title}</h3>
                        <p className="slide-price">
                          Rs
                          {parseFloat(
                            product.priceRange.minVariantPrice.amount,
                          ).toFixed(2)}
                        </p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <button className="slider-btn next-btn" onClick={nextSlide}>
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Slider Dots */}
          <div className="slider-dots">
            {Array.from({ length: Math.ceil(latestProducts.length / 4) }).map(
              (_, index) => (
                <button
                  key={index}
                  className={`dot ${currentSlide === index ? "active" : ""}`}
                  onClick={() => setCurrentSlide(index)}
                />
              ),
            )}
          </div>
        </section>
      )}

      {/* All Products Grid */}
      <div className="product-section">
        <h2 className="section-title">Our Collection</h2>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Fetching curated collection...</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.length > 0 ? (
              products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() =>
                    handleAddToCart(product.variants.edges[0].node.id)
                  }
                />
              ))
            ) : (
              <div className="no-products">
                <h3>No products found</h3>
                <p>Please check your Storefront API settings in .env</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}

export default Home;
