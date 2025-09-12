import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

/* -------------------------------------------------- */
/* Redis Store Config (optional)                      */
/* -------------------------------------------------- */
let storeOptions = {};
if (process.env.REDIS_URL) {
  const redisClient = new Redis(process.env.REDIS_URL);
  storeOptions = {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  };
}

/* -------------------------------------------------- */
/* Logging Helper                                     */
/* -------------------------------------------------- */
function logRateLimit(req, route) {
  console.warn(`🚨 Rate limit exceeded: IP=${req.ip} Route=${route}`);
}

/* -------------------------------------------------- */
/* Factory Function                                   */
/* -------------------------------------------------- */
function createLimiter({ route, windowMinutes, maxRequests, message }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    handler: (req, res, _next, options) => {
      logRateLimit(req, route);
      res.status(options.statusCode).json(options.message);
    },
    message: { error: message },
    ...storeOptions,
  });
}

/* -------------------------------------------------- */
/* Limiters                                           */
/* -------------------------------------------------- */

// Global limiter (ทุก /api/* ยกเว้น /api/health)
export const apiLimiter = (req, res, next) => {
  if (req.path === "/health") return next();
  return createLimiter({
    route: "GLOBAL",
    windowMinutes: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW || "15", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || "100", 10),
    message: "Too many requests, please try again later.",
  })(req, res, next);
};

// Login limiter
export const loginLimiter = createLimiter({
  route: "LOGIN",
  windowMinutes: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || "1", 10),
  maxRequests: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || "5", 10),
  message: "Too many login attempts. Try again in 1 minute.",
});

// Register limiter
export const registerLimiter = createLimiter({
  route: "REGISTER",
  windowMinutes: parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW || "60", 10),
  maxRequests: parseInt(process.env.RATE_LIMIT_REGISTER_MAX || "10", 10),
  message: "Too many register attempts. Try again later.",
});
