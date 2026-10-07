const ApiError = require("../utils/ApiError");
const { uploadSectionFiles } = require("./upload");
const mediaService = require("../services/mediaService");
const LandingPage = require("../models/LandingPage");

const JSON_FIELDS = new Set(["button", "items", "settings"]);
const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const ITEM_IMAGE_FIELD = /^items\[(\d+)\]\[image\]$/;

const isMultipart = (req) => {
  const contentType = req.headers["content-type"] || "";
  return contentType.toLowerCase().includes("multipart/form-data");
};

const splitKey = (key) => {
  if (!key.includes("[")) {
    return [key];
  }

  const parts = [];
  const pattern = /([^[\]]+)|\[([^\]]*)\]/g;
  let match = pattern.exec(key);

  while (match) {
    parts.push(match[1] !== undefined ? match[1] : match[2]);
    match = pattern.exec(key);
  }

  return parts;
};

const parseJsonField = (field, value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    throw new ApiError(400, `${field} must be valid JSON`);
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new ApiError(400, `${field} must be valid JSON`);
  }
};

const setDeep = (root, parts, value) => {
  let current = root;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const next = parts[index + 1];

    if (BLOCKED_KEYS.has(part)) {
      throw new ApiError(400, "Invalid form field");
    }

    if (current[part] == null || typeof current[part] !== "object") {
      current[part] = /^\d+$/.test(next) ? [] : {};
    }

    current = current[part];
  }

  const last = parts[parts.length - 1];

  if (BLOCKED_KEYS.has(last)) {
    throw new ApiError(400, "Invalid form field");
  }

  current[last] = value;
};

const assertFileField = (fieldname) => {
  if (fieldname === "image" || fieldname === "logo") {
    return;
  }

  const match = ITEM_IMAGE_FIELD.exec(fieldname);

  if (!match || Number(match[1]) > 99) {
    throw new ApiError(400, "File fields must be image, logo, or items[0][image]");
  }
};

const normalizeSectionForm = (flat, files) => {
  const body = {};
  const sectionFiles = [];
  const seenFiles = new Set();
  let settingsProvided = false;

  for (const [key, value] of Object.entries(flat || {})) {
    if (Array.isArray(value)) {
      const parsedList = value.every((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
      if (!parsedList) {
        throw new ApiError(400, `Duplicate form field: ${key}`);
      }
      body[key] = value;
      continue;
    }

    if (key === "settings" || key.startsWith("settings[")) {
      settingsProvided = true;
    }

    if (JSON_FIELDS.has(key)) {
      body[key] = value === "" ? value : parseJsonField(key, value);
      continue;
    }

    const parts = splitKey(key);

    if (parts.length === 1) {
      body[key] = value;
      continue;
    }

    setDeep(body, parts, value);
  }

  for (const file of files || []) {
    assertFileField(file.fieldname);

    if (seenFiles.has(file.fieldname)) {
      throw new ApiError(400, `Duplicate file field: ${file.fieldname}`);
    }

    seenFiles.add(file.fieldname);
    sectionFiles.push(file);

    if (file.fieldname === "image" && body.image == null) {
      body.image = "";
    }

    if (file.fieldname === "logo") {
      if (body.settings == null || typeof body.settings !== "object" || Array.isArray(body.settings)) {
        body.settings = {};
      }
      if (body.settings.logo == null) {
        body.settings.logo = "";
      }
    }

    const itemMatch = ITEM_IMAGE_FIELD.exec(file.fieldname);

    if (itemMatch) {
      const index = Number(itemMatch[1]);

      if (!Array.isArray(body.items) || body.items[index] == null || typeof body.items[index] !== "object") {
        throw new ApiError(400, `items[${index}] is required when uploading items[${index}][image]`);
      }

      if (body.items[index].image == null) {
        body.items[index].image = "";
      }
    }
  }

  return { body, sectionFiles, settingsProvided };
};

const parseSectionForm = (req, res, next) => {
  if (!isMultipart(req)) {
    next();
    return;
  }

  uploadSectionFiles(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    try {
      const parsed = normalizeSectionForm(req.body, req.files);
      req.body = parsed.body;
      req.sectionFiles = parsed.sectionFiles;
      req.logoMergesExisting = Boolean(req.params.sectionKey) && !parsed.settingsProvided;
      next();
    } catch (parseError) {
      next(parseError);
    }
  });
};

const assignUploadedImage = async (req, fieldname, image) => {
  const payload = req.validated;

  if (fieldname === "image") {
    payload.image = image.url;
    payload.imagePublicId = image.publicId;
    return;
  }

  if (fieldname === "logo") {
    let settings = payload.settings && typeof payload.settings === "object" ? { ...payload.settings } : {};

    if (req.logoMergesExisting && req.params.sectionKey) {
      const existing = await LandingPage.findOne({ sectionKey: req.params.sectionKey }).select("settings").lean();
      settings = { ...(existing?.settings || {}), ...settings };
    }

    settings.logo = image.url;
    settings.logoPublicId = image.publicId;
    payload.settings = settings;
    return;
  }

  const match = ITEM_IMAGE_FIELD.exec(fieldname);
  const index = Number(match[1]);
  payload.items[index].image = image.url;
  payload.items[index].imagePublicId = image.publicId;
};

const attachUploadedImages = async (req, res, next) => {
  if (!req.sectionFiles?.length) {
    next();
    return;
  }

  const uploadedIds = [];

  try {
    const sectionKey = req.params.sectionKey || req.validated.sectionKey || "";

    for (const file of req.sectionFiles) {
      const image = await mediaService.uploadImage({
        buffer: file.buffer,
        sectionKey,
      });
      uploadedIds.push(image.publicId);
      await assignUploadedImage(req, file.fieldname, image);
    }

    next();
  } catch (error) {
    try {
      await mediaService.deleteManagedImages(uploadedIds);
    } catch (cleanupError) {
      console.error("Failed to clean up uploaded images:", cleanupError.message);
    }

    next(error);
  }
};

module.exports = {
  parseSectionForm,
  attachUploadedImages,
};
