const Joi = require("joi");
const ApiError = require("../utils/ApiError");

const deleteSchema = Joi.object({
  publicId: Joi.string().trim().max(500).allow(""),
  url: Joi.string().trim().max(4000).allow(""),
})
  .unknown(false)
  .custom((value, helpers) => {
    if (!value.publicId && !value.url) {
      return helpers.message("publicId or url is required");
    }

    return value;
  }, "image identity");

const validateDeleteImage = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Request body must be a JSON object");
  }

  const { error, value } = deleteSchema.validate(body, {
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

module.exports = { validateDeleteImage };
