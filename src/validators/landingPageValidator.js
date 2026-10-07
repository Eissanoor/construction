const Joi = require("joi");
const ApiError = require("../utils/ApiError");
const { SECTION_KEYS, SECTION_DEFINITIONS, isAllowedSectionKey } = require("../config/sectionConfig");

const SERVER_FIELDS = ["_id", "id", "__v", "createdAt", "updatedAt"];

const createSchemas = {};
const updateSchemas = {};

const throwValidationError = (error) => {
  const errors = error.details.map((detail) => ({
    field: detail.path.join("."),
    message: detail.message.replace(/"/g, ""),
  }));

  throw new ApiError(400, "Validation failed", errors);
};

const assertSectionKey = (sectionKey) => {
  if (!isAllowedSectionKey(sectionKey)) {
    throw new ApiError(400, "Invalid section key");
  }
};

const definitionFor = (sectionKey) =>
  SECTION_DEFINITIONS[sectionKey] || {
    sectionKey,
    requiredOnCreate: [],
  };

const assertObjectBody = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Request body must be a JSON object");
  }
};

const stripServerFields = (body) => {
  const payload = { ...body };

  for (const field of SERVER_FIELDS) {
    delete payload[field];
  }

  return payload;
};

const shortText = (max, { required = false, nonEmpty = false } = {}) => {
  let schema = Joi.string().trim().max(max);

  if (required || nonEmpty) {
    schema = schema.min(1);
  } else {
    schema = schema.allow("");
  }

  if (required) {
    schema = schema.required();
  }

  return schema;
};

const longText = (max, { required = false, nonEmpty = false } = {}) => {
  let schema = Joi.string().max(max);

  if (required || nonEmpty) {
    schema = schema.min(1);
  } else {
    schema = schema.allow("");
  }

  if (required) {
    schema = schema.required();
  }

  return schema;
};

const buttonSchema = (isCreate) => {
  const shape = {
    text: Joi.string().trim().allow("").max(120),
    link: Joi.string().trim().allow("").max(2000),
  };

  if (!isCreate) {
    return Joi.object(shape);
  }

  return Joi.object({
    text: shape.text.default(""),
    link: shape.link.default(""),
  }).default({ text: "", link: "" });
};

const buildSchema = (definition, mode) => {
  const isCreate = mode === "create";
  const requiredOnCreate = definition.requiredOnCreate || [];
  const isRequired = (field) => isCreate && requiredOnCreate.includes(field);
  const cannotBeEmpty = (field) => requiredOnCreate.includes(field);

  return Joi.object({
    sectionKey: isCreate ? Joi.string().valid(definition.sectionKey).required() : Joi.any().strip(),
    sectionName: shortText(120, { required: isCreate, nonEmpty: true }),
    order: isCreate ? Joi.number().integer().min(0).required() : Joi.number().integer().min(0),
    title: shortText(300, { required: isRequired("title"), nonEmpty: cannotBeEmpty("title") }),
    subtitle: shortText(500, { required: isRequired("subtitle"), nonEmpty: cannotBeEmpty("subtitle") }),
    description: longText(20000, {
      required: isRequired("description"),
      nonEmpty: cannotBeEmpty("description"),
    }),
    image: shortText(4000, { required: isRequired("image"), nonEmpty: cannotBeEmpty("image") }),
    imagePublicId: shortText(500),
    button: buttonSchema(isCreate),
    items: Joi.array()
      .items(definition.itemSchema || Joi.object().unknown(true))
      .max(100),
    settings: definition.settingsSchema || Joi.object().unknown(true),
    isActive: Joi.boolean(),
  }).unknown(false);
};

for (const sectionKey of SECTION_KEYS) {
  createSchemas[sectionKey] = buildSchema(SECTION_DEFINITIONS[sectionKey], "create");
  updateSchemas[sectionKey] = buildSchema(SECTION_DEFINITIONS[sectionKey], "update");
}

const validateOptions = {
  abortEarly: false,
  stripUnknown: false,
  convert: true,
};

const validateCreate = (body) => {
  assertObjectBody(body);
  const payload = stripServerFields(body);

  if (!payload.sectionKey) {
    throw new ApiError(400, "sectionKey is required");
  }

  if (typeof payload.sectionKey === "string") {
    payload.sectionKey = payload.sectionKey.trim().toLowerCase();
  }

  assertSectionKey(payload.sectionKey);

  const schema = createSchemas[payload.sectionKey] || buildSchema(definitionFor(payload.sectionKey), "create");
  const { error, value } = schema.validate(payload, validateOptions);
  if (error) {
    throwValidationError(error);
  }

  return value;
};

const validateUpdate = (sectionKey, body) => {
  const key = typeof sectionKey === "string" ? sectionKey.trim().toLowerCase() : sectionKey;
  assertSectionKey(key);
  assertObjectBody(body);

  const payload = stripServerFields(body);

  if (Object.prototype.hasOwnProperty.call(payload, "sectionKey")) {
    const incoming = typeof payload.sectionKey === "string" ? payload.sectionKey.trim().toLowerCase() : payload.sectionKey;
    if (incoming !== key) {
      throw new ApiError(400, "sectionKey cannot be changed");
    }
    delete payload.sectionKey;
  }

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, "No fields to update");
  }

  const schema = updateSchemas[key] || buildSchema(definitionFor(key), "update");
  const { error, value } = schema.validate(payload, {
    ...validateOptions,
    noDefaults: true,
  });

  if (error) {
    throwValidationError(error);
  }

  return value;
};

const reorderSchema = Joi.object({
  sections: Joi.array()
    .items(
      Joi.object({
        sectionKey: Joi.string()
          .trim()
          .lowercase()
          .custom((value, helpers) => {
            if (!isAllowedSectionKey(value)) {
              return helpers.message("Invalid section key");
            }

            return value;
          }, "section key")
          .required(),
        order: Joi.number().integer().min(0).required(),
      })
    )
    .min(1)
    .required()
    .custom((sections, helpers) => {
      const keys = new Set();
      const orders = new Set();

      for (const section of sections) {
        if (keys.has(section.sectionKey)) {
          return helpers.message("sections contains a duplicate sectionKey");
        }
        if (orders.has(section.order)) {
          return helpers.message("sections contains a duplicate order");
        }
        keys.add(section.sectionKey);
        orders.add(section.order);
      }

      return sections;
    }, "unique section keys and order"),
}).unknown(false);

const validateReorder = (body) => {
  assertObjectBody(body);
  const { error, value } = reorderSchema.validate(body, validateOptions);

  if (error) {
    throwValidationError(error);
  }

  return value;
};

const statusSchema = Joi.object({
  isActive: Joi.boolean(),
}).unknown(false);

const validateStatus = (body) => {
  if (body == null) {
    return {};
  }

  assertObjectBody(body);
  const { error, value } = statusSchema.validate(stripServerFields(body), validateOptions);

  if (error) {
    throwValidationError(error);
  }

  return value;
};

module.exports = {
  assertSectionKey,
  validateCreate,
  validateUpdate,
  validateReorder,
  validateStatus,
};
