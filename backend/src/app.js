import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import pool from "./db.js";
import redisClient from "./config/redis.js";

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

/* -------------------------------------------------- */
/* Resolve __dirname (ESM)                             */
/* -------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------------------------- */
/* Middleware                                         */
/* -------------------------------------------------- */

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

// Body parsers & cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security & performance
app.use(helmet());
app.use(compression());

// Logging
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

/* -------------------------------------------------- */
/* Static: Font Awesome (local via node_modules)      */
/* -------------------------------------------------- */
/**
 * Folder structure:
 * backend/
 *   ├─ node_modules/@fortawesome/fontawesome-free/css
 *   └─ node_modules/@fortawesome/fontawesome-free/webfonts
 *
 * This exposes:
 *   /css/all.min.css
 *   /webfonts/* (woff2, woff, ttf)
 *
 * Then in your frontend HTML:
 *   <link rel="stylesheet" href="/css/all.min.css" />
 */
const faBase = path.join(__dirname, "..", "node_modules", "@fortawesome", "fontawesome-free");

app.use(
  "/css",
  express.static(path.join(faBase, "css"), {
    maxAge: "30d",
    immutable: true,
  })
);
app.use(
  "/webfonts",
  express.static(path.join(faBase, "webfonts"), {
    maxAge: "30d",
    immutable: true,
  })
);

/* -------------------------------------------------- */
/* Security: Rate Limiting                            */
/* -------------------------------------------------- */
app.use("/api/", apiLimiter);

/* -------------------------------------------------- */
/* Routes                                             */
/* -------------------------------------------------- */
app.use("/api/auth/login", loginLimiter, authRoutes);
app.use("/api/auth/register", registerLimiter, authRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/settings", settingsRoutes);

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    const redisStatus = redisClient.isOpen ? "connected" : "disconnected";

    res.status(200).json({
      status: "OK",
      env: process.env.NODE_ENV,
      uptime: process.uptime(),
      db: "connected",
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      env: process.env.NODE_ENV,
      uptime: process.uptime(),
      db: "disconnected",
      redis: redisClient.isOpen ? "connected" : "disconnected",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/* -------------------------------------------------- */
/* Error Handling                                     */
/* -------------------------------------------------- */
// Favicon request handler
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Catch-all for undefined API routes
app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
