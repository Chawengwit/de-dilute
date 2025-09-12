import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

let storeOptions = {};

// ถ้ามี REDIS_URL → ใช้ RedisStore
if (process.env.REDIS_URL) {
  const redisClient = new Redis(process.env.REDIS_URL);
  storeOptions = {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  };
}

// ฟังก์ชัน log เวลาโดน block
function logRateLimit(req, route) {
  console.warn(`🚨 Rate limit exceeded: IP=${req.ip} Route=${route}`);
}

// Global limiter (ทุก /api/*)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 100, // 100 requests ต่อ 15 นาที
  handler: (req, res, next, options) => {
    logRateLimit(req, "GLOBAL");
    res.status(options.statusCode).json(options.message);
  },
  message: { error: "Too many requests, please try again later." },
  ...storeOptions,
});

// Login limiter
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 นาที
  max: 5, // 5 ครั้ง/นาที
  handler: (req, res, next, options) => {
    logRateLimit(req, "LOGIN");
    res.status(options.statusCode).json(options.message);
  },
  message: { error: "Too many login attempts. Try again in 1 minute." },
  ...storeOptions,
});

// Register limiter
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  max: 10, // 10 ครั้ง/ชม.
  handler: (req, res, next, options) => {
    logRateLimit(req, "REGISTER");
    res.status(options.statusCode).json(options.message);
  },
  message: { error: "Too many register attempts. Try again later." },
  ...storeOptions,
});
