import Joi from "joi";

/** ========== Auth Schemas ========== */
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  display_name: Joi.string().min(3).max(30).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

/** ========== Product Schemas ========== */
export const productSchema = Joi.object({
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).min(3).max(50).required(),
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().allow("").optional(),
  price: Joi.number().precision(2).min(0).required(),
  is_active: Joi.boolean().default(true),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().allow(""),
  price: Joi.number().precision(2).min(0),
  is_active: Joi.boolean(),
}).min(1); // require at least one field

/** ========== Common Schemas ========== */
export const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

export const idSchema = Joi.object({
  id: Joi.number().integer().required(),
});
