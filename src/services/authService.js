const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new ApiError(500, "JWT_SECRET is not defined");
  }

  return jwt.sign({ sub: String(userId) }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });

  if (existing) {
    throw new ApiError(409, "Email is already registered");
  }

  const user = await User.create({ name, email, password });

  return {
    user: user.toSafeObject(),
    token: signToken(user._id),
  };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const matches = await user.comparePassword(password);

  if (!matches) {
    throw new ApiError(401, "Invalid email or password");
  }

  return {
    user: user.toSafeObject(),
    token: signToken(user._id),
  };
};

module.exports = {
  register,
  login,
};
