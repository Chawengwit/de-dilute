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
import redisClient from "./config/redis.js"; // อาจเป็น null ได้ (ถ้าไม่มี REDIS_URL)

// Routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import mediaRoutes from "./routes/media.js";
import settingsRoutes from "./routes/settings.js";

// Security middleware
import {
  apiLimiter,
  loginLimiter,
  registerLimiter,
} from "./middleware/security.js";

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
/* CORS                                                */
/* -------------------------------------------------- */
const isProd = process.env.NODE_ENV === "production";

// รองรับหลายโดเมนผ่าน ALLOWED_ORIGINS (คั่นด้วย ,)
// ถ้าไม่ระบุ ให้ใช้ FRONTEND_URL เดียว
const allowedOriginsEnv =
  process.env.ALLOWED_ORIGINS ||
  (process.env.FRONTEND_URL ? String(process.env.FRONTEND_URL) : "");

const allowedOrigins = allowedOriginsEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = isProd
  ? {
      origin: (origin, cb) => {
        // อนุญาต no-origin (เช่น curl/health) หรือ origin ที่อยู่ใน allowlist
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return cb(null, true);
        }
        return cb(new Error("CORS blocked by policy"), false);
      },
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

/* -------------------------------------------------- */
/* Body & Cookies                                      */
/* -------------------------------------------------- */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

/* -------------------------------------------------- */
/* Security & Performance                              */
/* -------------------------------------------------- */
app.use(
  helmet({
    // ถ้าโหลดสื่อจาก CDN/โดเมนอื่น ต้อง cross-origin
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // ถ้าคุณใช้ COEP/COOP ที่อื่น ไม่เปิดในนี้ก็ได้
    // crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());

/* -------------------------------------------------- */
/* Logging                                             */
/* -------------------------------------------------- */
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

/* -------------------------------------------------- */
/* Static: Font Awesome                                */
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
/* Static (dev-local uploads)                          */
/* โปรดักชันใช้ R2/CDN ผ่าน PUBLIC_MEDIA_BASE_URL/Proxy */
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
/* Security: Rate Limiting                             */
/* -------------------------------------------------- */
app.use("/api/", apiLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", registerLimiter);

/* -------------------------------------------------- */
/* Routes                                              */
/* -------------------------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/settings", settingsRoutes);

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    const redisStatus = redisClient?.isOpen ? "connected" : "disabled";

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
      redis: redisClient?.isOpen ? "connected" : "disabled",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/* -------------------------------------------------- */
/* Error Handling                                      */
/* -------------------------------------------------- */
app.get("/favicon.ico", (_req, res) => res.status(204).end());

app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
