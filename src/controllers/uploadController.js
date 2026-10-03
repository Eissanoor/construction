const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/apiResponse");
const { SECTION_KEYS } = require("../config/sectionConfig");
const mediaService = require("../services/mediaService");

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Image file is required");
  }

  const sectionKey = typeof req.body.sectionKey === "string" ? req.body.sectionKey.trim() : "";

  if (sectionKey && !SECTION_KEYS.includes(sectionKey)) {
    throw new ApiError(400, "Invalid section key");
  }

  const image = await mediaService.uploadImage({
    buffer: req.file.buffer,
    sectionKey,
  });

  return sendSuccess(res, 201, "Image uploaded successfully", image);
});

const deleteImage = asyncHandler(async (req, res) => {
  const image = await mediaService.deleteImage(req.validated);
  return sendSuccess(res, 200, "Image deleted successfully", image);
});

module.exports = {
  uploadImage,
  deleteImage,
};
