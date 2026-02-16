import React from "react";
import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "../css/ProductCard.css";

const ProductCard = ({ product, onAddToCart }) => {
  const image =
    product.images.edges[0]?.node?.url ||
    "https://dummyimage.com/600x400/000/fff";
  const price = product.variants.edges[0]?.node?.price;

  return (
    <motion.div
      className="product-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <div className="product-image-container">
        <Link to={`/product/${product.handle}`} className="product-image-link">
          <img src={image} alt={product.title} className="product-image" />
        </Link>
        <button
          className="quick-add-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToCart();
          }}
        >
          <ShoppingCart size={20} />
          <span>Add to Cart</span>
        </button>
      </div>
      <Link to={`/product/${product.handle}`} className="product-link">
        <h3>{product.title}</h3>

        <div className="product-info">
          <h3 className="product-name">{product.title}</h3>
          <p className="product-price">
            {price ? `${price.amount} ${price.currencyCode}` : "Price N/A"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
