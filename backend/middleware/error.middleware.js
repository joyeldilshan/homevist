/**
 * Global Express error handler.
 * Any controller that calls next(err) lands here.
 */
exports.errorHandler = (err, req, res, next) => {
  console.error("❌", err.message);

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

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
