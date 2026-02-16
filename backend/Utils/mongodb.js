const { MongoClient } = require("mongodb");
require("dotenv").config();

const mongo_url = process.env.MONGO_CONN;
let db = null;

// Auto-connect on require 
const client = new MongoClient(mongo_url);

client.connect()
    .then(() => {
        db = client.db(); // Uses the database specified in the connection string
        console.log("MongoDB Native Driver Connected");
    })
    .catch((err) => {
        console.error("MongoDB Connection Error:", err);
    });

// Get database instance
const getDB = () => {
    if (!db) {
        throw new Error("Database not initialized yet. Wait for connection.");
    }
    return db;
};

module.exports = { getDB };
