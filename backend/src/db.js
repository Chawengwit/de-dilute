import pkg from "pg";
import dotenv from "dotenv";

// โหลดไฟล์ env (เลือกตาม NODE_ENV)
dotenv.config();

const { Pool } = pkg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Event listeners for pool
pool.on("connect", () => {
  console.log("🟢 PostgreSQL pool connected");
});

pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
  process.exit(-1);
});

// Export query function
export const query = (text, params) => pool.query(text, params);

export default pool;