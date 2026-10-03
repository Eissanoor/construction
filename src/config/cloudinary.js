const cloudinary = require("cloudinary").v2;
const ApiError = require("../utils/ApiError");

let configured = false;

const getFolder = () => {
  const folder = (process.env.CLOUDINARY_FOLDER || "landing-page").trim().replace(/^\/+|\/+$/g, "");

  if (!/^[a-zA-Z0-9/_-]+$/.test(folder)) {
    throw new ApiError(500, "CLOUDINARY_FOLDER is invalid");
  }

  return folder;
};

const isConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
};

const getClient = () => {
  if (!isConfigured()) {
    throw new ApiError(500, "Cloudinary is not configured");
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
};

module.exports = {
  getClient,
  getFolder,
  isConfigured,
};
