const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const authService = require("../services/authService");

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.validated);
  return sendSuccess(res, 201, "Registered successfully", result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validated);
  return sendSuccess(res, 200, "Logged in successfully", result);
});

const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, "Profile fetched successfully", req.user);
});

module.exports = {
  register,
  login,
  me,
};
