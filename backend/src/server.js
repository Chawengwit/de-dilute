import dotenv from 'dotenv';
import app from './app.js';
import pool from './db.js'; // PostgreSQL connection pool

// Load environment variables dynamically based on NODE_ENV
const envPath = `../.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envPath });

const PORT = process.env.BACKEND_PORT || 3000;

// Start server after ensuring DB connection
async function startServer() {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Database connected successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server is running`);
    });
  } catch (err) {
    console.error("❌ Failed to connect to the database:", err);
    process.exit(1);
  }
}

startServer();