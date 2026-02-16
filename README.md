# E-Commerce Project

A comprehensive e-commerce platform integrated with Shopify for product management and checkout, featuring a custom MERN (MongoDB, Express, React, Node.js) stack for analytics and order tracking.

## 🚀 Overview

This project provides a robust solution for a single-store e-commerce application. It leverages Shopify's Storefront API for a seamless shopping experience while maintaining a local database for advanced analytics, order processing via webhooks, and administrative management.

## 🛠️ Tech Stack

### Backend

- **Node.js & Express**: Core server framework.
- **MongoDB & Mongoose**: Local data storage for analytics and orders.
- **Shopify API**: Integration with Shopify for Admin and Storefront operations.
- **JWT & Bcrypt**: Secure authentication for the admin dashboard.
- **GraphQL**: Communication with Shopify Storefront API.

### Frontend

- **React**: Modern UI development.
- **Material UI (MUI)**: Premium component library for the admin dashboard.
- **Framer Motion**: Smooth animations.
- **Recharts**: Data visualization for analytics.
- **Styled Components**: Component-level styling.

## 📁 Project Structure

```text
ecommerce-project/
├── backend/            # Express server, MongoDB models, Shopify integrations
│   ├── Controllers/    # Business logic for webhooks, analytics, and orders
│   ├── Models/         # Mongoose schemas
│   ├── Routes/         # API endpoints
│   └── Utils/          # Helper functions
└── frontend/           # React application
    ├── src/
    │   ├── Components/ # Reusable UI components
    │   ├── Pages/      # Main application pages
    │   └── Utils/      # API services and helpers
```

## ⚓ Webhooks (Shopify Integration)

The backend includes a dedicated endpoint to handle real-time updates from Shopify. This ensures that the local database remains synchronized with store activity.

### Endpoint

- **URL**: `POST /webhook/shopify`
- **Security**: Mandatory HMAC verification using `X-Shopify-Hmac-Sha256` header.

### Handled Topics

- `orders/create`: Triggered when a new order is placed.
- `orders/updated`: Triggered when any detail of an order changes.
- `orders/fulfilled`: Triggered when an order is marked as fulfilled.
- `orders/paid`: Triggered when payment is successful.
- `orders/partially_fulfilled`: Triggered for partial shipments.

### Processing Logic

1. **Verification**: Validates the request signature using the `SHOPIFY_WEBHOOK_SECRET`.
2. **Data Enrichment**: Fetches the complete order details via the Shopify Admin API for accuracy.
3. **Storage**:
   - Saves the full raw payload to the `orders` collection.
   - Extracts and flattens line items into the `order_line_item` collection for easier analytics.
4. **Analytics Refresh**: Automatically triggers a background process to update sales and refund metrics.

## ⚙️ Setup Instructions

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB account (Atlas or local)
- Shopify Store & API credentials

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Fill in your environment variables in `.env`.
5. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Fill in your environment variables in `.env`.
5. Start the development server:
   ```bash
   npm start
   ```

## 🔗 Key Features

- **Real-time Sync**: Shopify webhooks process order updates automatically.
- **Analytics Dashboard**: Comprehensive charts and metrics for sales tracking.
- **Secure Admin**: Protected routes for managing orders and viewing analytics.
- **Shopify Checkout**: Leveraging Shopify's secure and proven checkout flow.
