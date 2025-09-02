import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import dotenv from "dotenv";

// validation middleware
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../schemas/schemas.js";

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post("/register", validate(registerSchema), async (req, res) => {
    try {
        const { email, password, display_name } = req.body;

        // Check if user already exists
        const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: "User already exists." });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert user
        const result = await pool.query(
            "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name, created_at",
            [email, password_hash, display_name || null]
        );

        const user = result.rows[0];

        res.status(201).json({
            message: "User registered successfully.",
            user,
        });
    } catch (err) {
        console.error("❌ Register error:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

/**
 * @route POST /api/auth/login
 * @desc Login user and return JWT token
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

        // Save JWT in HttpOnly Secure Cookie
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // HTTPS only in production
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            message: "Login successful.",
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                created_at: user.created_at,
            },
        });
    } catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

/**
 * @route POST /api/auth/logout
 * @desc Clear JWT cookie
 * @access Public
 */
router.post("/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ message: "Logged out successfully." });
});

export default router;
