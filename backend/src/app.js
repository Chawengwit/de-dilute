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
/* Trust proxy (Render/NGINX)                          */
/* -------------------------------------------------- */
app.set("trust proxy", 1);

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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Security & performance
app.use(
  helmet({
    // เปิดใช้งานถ้าต้องเสิร์ฟไฟล์ให้ frontend ต่างโดเมน หรือโหลดรูป/วิดีโอจาก CDN
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());

// Logging
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

/* -------------------------------------------------- */
/* Static: Font Awesome (local via node_modules)      */
/* -------------------------------------------------- */
const faBase = path.join(
  __dirname,
  "..",
  "node_modules",
  "@fortawesome",
  "fontawesome-free"
);

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
/* Static (optional): Local uploaded media             */
/* หมายเหตุ: ในโปรดักชันคุณใช้ R2/S3 (PUBLIC_MEDIA_BASE_URL) แล้ว
   บล็อกนี้มีไว้เผื่อกรณี dev ที่ยังอัปไฟล์โลคัล (ไม่กระทบ R2) */
/* -------------------------------------------------- */
const uploadsDir = path.resolve("uploads");
app.use(
  "/media",
  express.static(uploadsDir, {
    maxAge: "7d",
    etag: true,
    index: false,
    setHeaders(res) {
      res.setHeader("Accept-Ranges", "bytes");
    },
  })
);

/* -------------------------------------------------- */
/* Security: Rate Limiting                            */
/* -------------------------------------------------- */
app.use("/api/", apiLimiter);

// เจาะจงเพิ่ม limiter ให้ login/register ก่อน mount authRoutes
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", registerLimiter);

/* -------------------------------------------------- */
/* Routes                                             */
/* -------------------------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/settings", settingsRoutes);

// Health check
app.get("/api/health", async (_req, res) => {
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
app.get("/favicon.ico", (_req, res) => res.status(204).end());

// Catch-all for undefined API routes
app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
