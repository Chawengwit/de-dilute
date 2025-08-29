import { Router } from "express";
import pool from "../db.js";
import { validate } from "../middleware/validate.js";
import {
  productSchema,
  updateProductSchema,
  paginationSchema,
  idSchema,
} from "../middleware/schemas.js";

const router = Router();

/**
 * GET /api/products/public
 * Public landing data (active products + media) with pagination
 */
router.get("/public", validate(paginationSchema, "query"), async (req, res) => {
  try {
    const { limit, offset } = req.query;

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

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching public products:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/products/add
 * Create product (example admin route – add your auth/role middleware upstream)
 */
router.post("/add", validate(productSchema, "body"), async (req, res) => {
  try {
    const { slug, name, description, price, is_active } = req.body;

    const query = `
      INSERT INTO products (slug, name, description, price, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await pool.query(query, [slug, name, description ?? null, price, is_active ?? true]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // handle unique violation for slug
    if (err.code === "23505") {
      return res.status(409).json({ error: "Slug already exists" });
    }
    console.error("❌ Error adding product:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/products/update/:id
 * Update product by id
 */
router.put("/update/:id", validate(idSchema, "params"), validate(updateProductSchema, "body"), async (req, res) => {
    try {
      const { id } = req.params;

      const fields = Object.keys(req.body);
      const values = Object.values(req.body);

      // build dynamic SET clause
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
      res.json(result.rows[0]);
    } catch (err) {
      console.error("❌ Error updating product:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * DELETE /api/products/delete/:id
 * Delete product by id
 */
router.delete("/delete/:id", validate(idSchema, "params"), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING *;", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: "Product deleted", product: result.rows[0] });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
