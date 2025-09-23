import redisClient from "../config/redis.js";

/**
 * Middleware สำหรับ cache API responses
 * @param {string} keyPrefix - prefix ของ cache key
 * @param {number} ttl - เวลาเก็บ cache (วินาที)
 */
export function cache(keyPrefix, ttl = 60) {
  return async (req, res, next) => {
    try {
      const key = keyPrefix + JSON.stringify(req.query || {});
      const cached = await redisClient.get(key);

      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // override res.json → เพื่อเก็บ cache หลัง query DB
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        redisClient.setEx(key, ttl, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error("Cache middleware error:", err);
      next(); // ให้ไป query DB ต่อถ้ามี error
    }
  };
}

/**
 * ฟังก์ชันลบ cache ตาม prefix
 * ใช้เวลามีการ insert/update/delete เพื่อ clear ข้อมูลเก่า
 */
export async function invalidateCache(keyPrefix) {
  try {
    const keys = await redisClient.keys(`${keyPrefix}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error("Error invalidating cache:", err);
  }
}
