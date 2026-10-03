const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new ApiError(401, "Authentication is required");
    }

    if (!process.env.JWT_SECRET) {
      throw new ApiError(500, "JWT_SECRET is not defined");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      throw new ApiError(401, "Invalid or expired token");
    }

    req.user = user.toSafeObject();
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    next(new ApiError(401, "Invalid or expired token"));
  }
};

module.exports = requireAuth;
