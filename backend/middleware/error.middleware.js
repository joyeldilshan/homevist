const logger = require("../utils/logger");

/**
 * Global Express error handler.
 * Any controller that calls next(err) lands here.
 */
exports.errorHandler = (err, req, res, next) => {
  logger.error("❌", err.message);

  let status  = err.statusCode || 500;
  let message = err.message    || "Internal Server Error";

  // Mongoose duplicate key  e.g. unique email
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    status  = 400;
  }

  // Mongoose schema validation errors
  if (err.name === "ValidationError") {
    message = Object.values(err.errors).map((e) => e.message).join(", ");
    status  = 400;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") { message = "Invalid token.";  status = 401; }
  if (err.name === "TokenExpiredError") { message = "Token expired.";  status = 401; }

  // A malformed ID ("not-an-id" where an ObjectId belongs) is simply a
  // record that does not exist. It used to come back as a 500 carrying
  // mongoose's own message ("Cast to ObjectId failed for value ...").
  if (err.name === "CastError") { message = "Not found."; status = 404; }

  // Anything unexpected: details go to the server log only, never to the
  // client (database errors can echo queries, fields and values).
  if (status >= 500) {
    if (err.stack) logger.error(err.stack);
    message = "Something went wrong. Please try again.";
  }

  res.status(status).json({
    success: false,
    message,
  });
};
