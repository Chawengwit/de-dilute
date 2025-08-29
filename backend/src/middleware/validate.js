/**
 * Generic Joi validation middleware
 * @param {Object} schema - Joi schema object
 * @param {"body"|"query"|"params"} property - Which part of the request to validate
 */
export function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,   // show all errors
      stripUnknown: true,  // remove fields not in schema
      convert: true,       // coerce types (e.g. "10" -> 10)
    });

    if (error) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.details.map(d => d.message),
      });
    }

    req[property] = value; // assign sanitized/validated values back
    next();
  };
}
