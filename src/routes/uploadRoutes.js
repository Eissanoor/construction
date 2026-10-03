const express = require("express");
const controller = require("../controllers/uploadController");
const { uploadImage } = require("../middleware/upload");
const { validate } = require("../middleware/validate");
const { validateDeleteImage } = require("../validators/uploadValidator");

const router = express.Router();

router.post("/", uploadImage, controller.uploadImage);
router.delete("/", validate((req) => validateDeleteImage(req.body)), controller.deleteImage);

module.exports = router;
