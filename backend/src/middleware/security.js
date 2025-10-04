// @backend/src/middleware/security.js
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis"; // ต้องใช้เวอร์ชันที่มี named export
import redisClient from "../config/redis.js";

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */
function toInt(v, def) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function logRateLimit(req, route) {
  console.warn(`Rate limit exceeded: IP=${req.ip} Route=${route}`);
}

/* -------------------------------------------------- */
/* Limiter Factory                                    */
/* -------------------------------------------------- */
function createLimiter({ route, windowMinutes, maxRequests, message, prefix }) {
  const windowMs = toInt(windowMinutes, 15) * 60 * 1000;
  const max = toInt(maxRequests, 100);

  // มี Redis → ใช้ RedisStore / ไม่มี → ใช้ in-memory
  const useRedis = Boolean(redisClient);

  const baseOptions = {
    windowMs,
    max,
    handler: (req, res, _next, options) => {
      logRateLimit(req, route);
      res.status(options.statusCode).json(options.message);
    },
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  };

  if (useRedis) {
    return rateLimit({
      ...baseOptions,
      store: new RedisStore({
        // node-redis v4: ต้องใช้ sendCommand
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix,
      }),
    });
  }

  // ไม่มี REDIS_URL → ใช้ in-memory
  console.log(`[RateLimit] ${route}: using in-memory store`);
  return rateLimit(baseOptions);
}

/* -------------------------------------------------- */
/* Limiters (สร้างครั้งเดียว)                         */
/* -------------------------------------------------- */

// Global limiter
const globalLimiter = createLimiter({
  route: "GLOBAL",
  windowMinutes: process.env.RATE_LIMIT_GLOBAL_WINDOW || "15",
  maxRequests: process.env.RATE_LIMIT_GLOBAL_MAX || "100",
  message: "Too many requests, please try again later.",
  prefix: "rl:global:",
});

// Wrapper สำหรับ health check ไม่ต้องนับ rate
export function apiLimiter(req, res, next) {
  if (req.path === "/health") return next();
  return globalLimiter(req, res, next);
}

// Login limiter
export const loginLimiter = createLimiter({
  route: "LOGIN",
  windowMinutes: process.env.RATE_LIMIT_LOGIN_WINDOW || "1",
  maxRequests: process.env.RATE_LIMIT_LOGIN_MAX || "5",
  message: "Too many login attempts. Try again in 1 minute.",
  prefix: "rl:login:",
});

// Register limiter
export const registerLimiter = createLimiter({
  route: "REGISTER",
  windowMinutes: process.env.RATE_LIMIT_REGISTER_WINDOW || "60",
  maxRequests: process.env.RATE_LIMIT_REGISTER_MAX || "10",
  message: "Too many register attempts. Try again later.",
  prefix: "rl:register:",
});
