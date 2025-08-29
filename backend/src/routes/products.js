import { Router } from "express";
import pool from "../db.js";
import Joi from "joi";
import winston from "winston";

const router = Router();

// Winston logger setup
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Validation schema for pagination
const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

// Public route: GET /api/products/public
router.get("/public", async (req, res) => {
  try {
    // Validate query params
    const { error, value } = querySchema.validate(req.query);
    if(error){
      logger.warn("Invalid query params", { details: error.details });
      return res.status(400).json({ error: "Invalid query parameters" });
    }

    const { limit, offset } = value;
    // Fetch products + media(JOIN)
    const query = `
      SELECT p.id, p.slug, p.name, p.description, p.price, p.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', m.id,
                   'url', m.url,
                   'type', m.type,
                   'sort_order', m.sort_order
                 )
                 ORDER BY m.sort_order
               ) FILTER (WHERE m.id IS NOT NULL),
               '[]'
             ) AS media
      FROM products p
      LEFT JOIN product_media m ON p.id = m.product_id
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2;
    `;

    const result = await pool.query(query, [limit, offset]);
    logger.info("Public products fetched", {
      count: result.rows.length,
      limit,
      offset,
    });
    
    res.json(result.rows);

  } catch (err) {
    logger.error("Error fetching public products", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: "Internal server error" });
  }

});

export default router;
