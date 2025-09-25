import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../db.js"; // ✅ ใช้ตรวจสิทธิ์ใน requirePermission

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

/**
 * Helper: normalize permission from env
 * - รับ code เช่น "ADMIN"
 * - ถ้า .env มีแผนที่ไว้ เช่น ADMIN=SUPERADMIN → ใช้ค่าจาก env
 * - ถ้าไม่มีใน .env → ใช้ code ตรงๆ
 */
export function mapEnvPermission(code) {
  if (!code) return null;
  const mapped = process.env[code];
  return mapped || code;
}

/**
 * Middleware: Verify JWT from HttpOnly cookie (หรือ Authorization: Bearer)
 */
export function authenticate(req, res, next) {
  const cookieToken = req.cookies?.auth_token;
  const headerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;

  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // { id, email }
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}

/**
 * Middleware factory: require a specific permission
 * - ใช้คู่กับ authenticate แล้ว
 * - ตรวจจากตาราง permissions (user_id, name)
 * - ชื่อ permission จะถูกแมปผ่าน .env (mapEnvPermission)
 */
export function requirePermission(code) {
  return async function (req, res, next) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const permName = mapEnvPermission(code);
      if (!permName) {
        return res.status(400).json({ error: "Invalid permission code" });
      }

      const result = await pool.query(
        "SELECT 1 FROM permissions WHERE user_id = $1 AND name = $2 LIMIT 1",
        [req.user.id, permName]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: "Forbidden: Insufficient permission" });
      }

      next();
    } catch (err) {
      console.error("requirePermission error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
