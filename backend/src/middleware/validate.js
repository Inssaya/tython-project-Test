const ApiError = require('../utils/ApiError');

// Validates `req[part]` against a Zod schema and replaces it with the parsed value.
const validate = (schema, part = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[part]);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return next(ApiError.badRequest('Validation failed.', details));
  }
  req[part] = result.data;
  next();
};

module.exports = validate;
