// @backend/src/config/redis.js
import { createClient } from "redis";

const url = process.env.REDIS_URL?.trim();
const client = url ? createClient({ url }) : null;

if (client) {
  client.on("error", (err) => console.error("Redis Error:", err));
  client.on("connect", () => console.log("Redis connected"));
  await client.connect(); // ใช้ได้เพราะเป็น ESM top-level await
} else {
  console.log("Redis disabled (no REDIS_URL)");
}

export default client; // อาจเป็น null ได้เมื่อไม่มี REDIS_URL