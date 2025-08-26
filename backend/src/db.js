import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 5000 // return an error after 5s if connection could not be established
});

// Event listeners for pool
pool.on("connect", () => {
  console.log("🟢 PostgreSQL pool connected");
});

pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
  process.exit(-1); // Exit process on DB error
});

// Export query function for executing SQL queries
export const query = (text, params) => pool.query(text, params);

export default pool;
