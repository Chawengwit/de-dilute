import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

/**
 * Middleware: Verify JWT from HttpOnly cookie
 */
export function authenticate(req, res, next) {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email }
        next();
    } catch (err) {
        console.error("❌ JWT verify error:", err);
        res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
}
