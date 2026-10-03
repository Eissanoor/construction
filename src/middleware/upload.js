const multer = require("multer");
const ApiError = require("../utils/ApiError");

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

const fileFilter = (req, file, callback) => {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    callback(new ApiError(400, "Only JPEG, PNG, WEBP, GIF, and AVIF images can be uploaded"));
    return;
  }

  callback(null, true);
};

const createUploader = (files) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
      files,
    },
    fileFilter,
  });

const handleUpload = (middleware) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof ApiError) {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE" ? "Image must be 5MB or smaller" : "Image upload is invalid";
      next(new ApiError(400, message));
      return;
    }

    next(error);
  });
};

const uploadImage = handleUpload(createUploader(1).single("image"));
const uploadSectionFiles = handleUpload(createUploader(30).any());

module.exports = { uploadImage, uploadSectionFiles };
