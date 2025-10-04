import { Router } from "express";
import pool from "../db.js";
import { validate } from "../middleware/validate.js";
import {
  productSchema,
  updateProductSchema,
  paginationSchema,
  idSchema,
} from "../schemas/schemas.js";
import { cache, invalidateCache } from "../middleware/cache.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/products/public
 * Public landing data with pagination (cached 300s)
 */
router.get(
  "/public",
  validate(paginationSchema, "query"),
  cache("products_public:", 300),
  async (req, res) => {
    try {
      // paginationSchema จะ validate แล้ว แต่กันพลาดอีกชั้น
      const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);
      const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

      const query = `
        SELECT
          p.id,
          p.slug,
          p.name,
          p.description,
          p.price,
          p.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', m.id,
                'url', m.url,
                'type', m.type,
                'sort_order', m.sort_order,
                'purpose', m.purpose
              )
              ORDER BY m.sort_order
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'
          ) AS media
        FROM products p
        LEFT JOIN media_assets m
          ON m.entity_type = 'product'
         AND m.entity_id = p.id
        WHERE p.is_active = true
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2;
      `;

      const result = await pool.query(query, [limit, offset]);
      return res.json(result.rows);
    } catch (err) {
      console.error("GET /api/products/public error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * POST /api/products/add
 * ADMIN only
 */
router.post(
  "/add",
  authenticate,
  requirePermission("ADMIN"),
  validate(productSchema, "body"),
  async (req, res) => {
    try {
      const { slug, name, description, price, is_active } = req.body;

      const query = `
        INSERT INTO products (slug, name, description, price, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const result = await pool.query(query, [
        slug,
        name,
        description ?? null,
        price,
        is_active ?? true,
      ]);

      await invalidateCache("products_public:");
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "Slug already exists" });
      }
      console.error("POST /api/products/add error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * PUT /api/products/update/:id
 * ADMIN only
 */
router.put(
  "/update/:id",
  authenticate,
  requirePermission("ADMIN"),
  validate(idSchema, "params"),
  validate(updateProductSchema, "body"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const fields = Object.keys(req.body);
      if (fields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      const values = Object.values(req.body);
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
      const query = `
        UPDATE products
        SET ${setClause}
        WHERE id = $${values.length + 1}
        RETURNING *;
      `;

      const result = await pool.query(query, [...values, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      await invalidateCache("products_public:");
      return res.json(result.rows[0]);
    } catch (err) {
      console.error("PUT /api/products/update/:id error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * DELETE /api/products/delete/:id
 * ADMIN only
 */
router.delete(
  "/delete/:id",
  authenticate,
  requirePermission("ADMIN"),
  validate(idSchema, "params"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "DELETE FROM products WHERE id = $1 RETURNING *;",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      await invalidateCache("products_public:");
      return res.json({ message: "Product deleted", product: result.rows[0] });
    } catch (err) {
      console.error("DELETE /api/products/delete/:id error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
