const express = require("express");
const controller = require("../controllers/authController");
const { validate } = require("../middleware/validate");
const requireAuth = require("../middleware/requireAuth");
const { validateRegister, validateLogin } = require("../validators/authValidator");

const router = express.Router();

router.post("/register", validate((req) => validateRegister(req.body)), controller.register);
router.post("/login", validate((req) => validateLogin(req.body)), controller.login);
router.get("/me", requireAuth, controller.me);

module.exports = router;
