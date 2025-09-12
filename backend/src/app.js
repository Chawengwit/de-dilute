import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import pool from "./db.js";
import cookieParser from "cookie-parser";

// Import API routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import mediaRoutes from "./routes/media.js";
import settingsRoutes from "./routes/settings.js";

// Import security middleware
import {
  apiLimiter,
  loginLimiter,
  registerLimiter,
} from "./middleware/security.js";

// Load environment variables
dotenv.config();

const app = express();

// ---------------- Middleware ---------------- //
// CORS
const corsOptions =
  process.env.NODE_ENV === "production"
    ? {
        origin: process.env.FRONTEND_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }
    : {
        origin: "http://localhost:8080",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      };

app.use(cors(corsOptions));

// Parse JSON & form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security & performance
app.use(helmet()); // secure HTTP headers
app.use(compression()); // gzip/deflate responses

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ---------------- Security: Rate Limiting ---------------- //
// Global limiter
app.use("/api/", apiLimiter);

// ---------------- Routes ---------------- //
// Auth routes (เฉพาะ login/register ใส่ limiter แยก)
app.use("/api/auth/login", loginLimiter, authRoutes);
app.use("/api/auth/register", registerLimiter, authRoutes);

// Other routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/settings", settingsRoutes);

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "OK",
      env: process.env.NODE_ENV,
      uptime: process.uptime(),
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      env: process.env.NODE_ENV,
      uptime: process.uptime(),
      db: "disconnected",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ---------------- Error Handling ---------------- //
// Favicon request handler
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Catch-all for undefined API routes
app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
