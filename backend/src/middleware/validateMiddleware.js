// Middleware factory for Joi validation
const validate = (schema) => {
  return (req, res, next) => {
    // Validate request body against the provided schema
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove fields that are not defined in the schema
    });

    // If validation fails, return 400 with error details
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        message: "Validation failed",
        errors: errors,
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;

    // Proceed to the next middleware or route handler
    next();
  };
};

export default validate;
