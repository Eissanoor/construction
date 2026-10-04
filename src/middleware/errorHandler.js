const ApiError = require("../utils/ApiError");
const { sendError } = require("../utils/apiResponse");

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof SyntaxError && err.status === 400 && Object.prototype.hasOwnProperty.call(err, "body")) {
    return sendError(res, 400, "Invalid JSON body");
  }

  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.message, err.errors);
  }

  if (err.code === 11000 || err.errorResponse?.code === 11000) {
    const keyPattern = err.keyPattern || err.errorResponse?.keyPattern || {};
    const message = err.message || "";

    if (keyPattern.email || message.includes("email")) {
      return sendError(res, 409, "Email is already registered");
    }

    return sendError(res, 409, "Landing page section already exists");
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
    return sendError(res, 400, "Validation failed", errors);
  }

  if (err.name === "CastError") {
    return sendError(res, 400, "Validation failed", [{ field: err.path, message: "Invalid value" }]);
  }

  if (err.message === "MONGODB_URI is not defined") {
    console.error(err);
    return sendError(res, 503, "Database is not configured");
  }

  if (
    err.name === "MongooseServerSelectionError" ||
    err.name === "MongoServerSelectionError" ||
    /buffering timed out/i.test(err.message || "")
  ) {
    console.error(err);
    return sendError(res, 503, "Database is unavailable");
  }

  console.error(err);
  return sendError(res, 500, "Internal server error");
};

module.exports = errorHandler;
