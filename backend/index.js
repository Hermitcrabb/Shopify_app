const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AuthRouter = require("./Routes/AuthRouter");
const ShopifyWebhookRouter = require("./Routes/ShopifyWebhookRouter");
const AdminRouter = require("./Routes/AdminAnalyticsRouter");
const AdminOrderRouter = require("./Routes/AdminOrderRouter");
const RefreshRouter = require("./Routes/RefreshRouter");
const { refreshAnalyticsCollection } = require("./Controllers/DataController");

require("dotenv").config();
require("./Models/db");
require("./Utils/mongodb");

const PORT = process.env.PORT || 8080;

app.get("/ping", (req, res) => {
  res.send("PONG");
});


app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// WEBHOOKS MUST COME BEFORE BODYPARSER.JSON()
// This ensures HMAC verification gets the raw body buffer
app.use("/webhook", ShopifyWebhookRouter);

app.use(cookieParser());
app.use(bodyParser.json());

app.use("/admin-api", AdminRouter);
app.use("/admin-order", AdminOrderRouter);
app.use("/refresh", RefreshRouter);
app.use("/admin", AuthRouter);

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
