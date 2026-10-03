const Joi = require("joi");
const ApiError = require("../utils/ApiError");

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().lowercase().email().max(200).required(),
  password: Joi.string().min(8).max(72).required(),
}).unknown(false);

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(200).required(),
  password: Joi.string().required(),
}).unknown(false);

const validateBody = (schema, body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Request body must be a JSON object");
  }

  const { error, value } = schema.validate(body, {
    abortEarly: false,
    stripUnknown: false,
    convert: true,
  });

  if (error) {
    throw new ApiError(
      400,
      "Validation failed",
      error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message.replace(/"/g, ""),
      }))
    );
  }

  return value;
};

const validateRegister = (body) => validateBody(registerSchema, body);
const validateLogin = (body) => validateBody(loginSchema, body);

module.exports = {
  validateRegister,
  validateLogin,
};
