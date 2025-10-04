import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import dotenv from "dotenv";

// middleware
import { authenticate, mapEnvPermission } from "../middleware/auth.js";

// validation middleware
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../schemas/schemas.js";

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

/** Helper: read token from Cookie or Authorization header (optional) */
function readToken(req) {
  const cookieToken = req.cookies?.auth_token;
  const auth = req.headers.authorization || "";
  const headerToken = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;
  return cookieToken || headerToken || null;
}

/**
 * @route POST /api/auth/register
 * @desc Register a new user (default ไม่มีสิทธิ์ใด ๆ) + create empty permissions row
 * @access Public
 */
router.post("/register", validate(registerSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, display_name } = req.body;

    await client.query("BEGIN");

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "User already exists." });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await client.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, created_at`,
      [email, password_hash, display_name || null]
    );

    const user = result.rows[0];

    // create empty permissions row
    await client.query(
      "INSERT INTO permissions (user_id, name) VALUES ($1, NULL)",
      [user.id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "User registered successfully.",
      user,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error." });
  } finally {
    client.release();
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login & set HttpOnly cookie
 * @access Public
 */
router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Clear JWT cookie
 * @access Public
 */
router.post("/logout", (req, res) => {
  res.clearCookie("auth_token", { path: "/" });
  return res.json({ message: "Logged out successfully." });
});

/**
 * @route POST /api/auth/permissions
 * @desc Check if current user has a permission code; body: { permission: "ADMIN" }
 * @access Public (best-effort) → ถ้าไม่มี token จะได้ { hasPermission:false }
 */
router.post("/permissions", async (req, res) => {
  try {
    const { permission } = req.body || {};
    if (!permission) {
      return res.status(400).json({ error: "Permission code is required" });
    }

    const permName = mapEnvPermission(permission);
    if (!permName) {
      return res.status(400).json({ error: "Unknown permission code" });
    }

    // อ่าน token แบบ optional
    const token = readToken(req);
    if (!token) {
      return res.json({ hasPermission: false });
    }

    let payload = null;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.json({ hasPermission: false });
    }

    const result = await pool.query(
      "SELECT 1 FROM permissions WHERE user_id = $1 AND name = $2 LIMIT 1",
      [payload.id, permName]
    );

    return res.json({ hasPermission: result.rows.length > 0 });
  } catch (err) {
    console.error("check-permissions error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * (ทางเลือกเสริม) @route GET /api/auth/permissions/:code
 * ต้องล็อกอินเท่านั้น (เวอร์ชัน strict)
 */
router.get("/permissions/:code", authenticate, async (req, res) => {
  try {
    const code = req.params.code;
    const permName = mapEnvPermission(code);
    if (!permName) {
      return res.status(400).json({ error: "Unknown permission code" });
    }

    const result = await pool.query(
      "SELECT 1 FROM permissions WHERE user_id = $1 AND name = $2 LIMIT 1",
      [req.user.id, permName]
    );

    return res.json({ hasPermission: result.rows.length > 0 });
  } catch (err) {
    console.error("check-permissions GET error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Return current logged-in user
 * @access Private
 */
router.get("/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, display_name FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
