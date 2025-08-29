/**
 * Generic Joi validation middleware
 * @param {Object} schema - Joi schema object
 * @param {"body"|"query"|"params"} property - Which part of the request to validate
 */
export function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.details.map((d) => d.message),
      });
    }

    // ✅ safe assign (ไม่ reassign req.query/req.params ตรง ๆ)
    if (property === "query" || property === "params") {
      Object.assign(req[property], value);
    } else {
      req[property] = value;
    }

    next();
  };
}
