const ApiError = require("../utils/ApiError");
const { getClient, getFolder, isConfigured } = require("../config/cloudinary");

const isPlainObject = (value) => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !value._bsontype;
};

const publicIdFromCloudinaryUrl = (url) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname !== "res.cloudinary.com") {
    return null;
  }

  const [, cloudName, resourceType, delivery, ...rest] = parsed.pathname.split("/");

  if (resourceType !== "image" || delivery !== "upload" || rest.length === 0) {
    return null;
  }

  const configuredCloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (configuredCloud && cloudName !== configuredCloud) {
    return null;
  }

  const versionIndex = rest.findIndex((part) => /^v\d+$/.test(part));
  const idParts = (versionIndex >= 0 ? rest.slice(versionIndex + 1) : rest).filter((part) => part && !part.includes(","));

  if (idParts.length === 0) {
    return null;
  }

  idParts[idParts.length - 1] = idParts[idParts.length - 1].replace(/\.[a-z0-9]+$/i, "");
  return idParts.join("/");
};

const isManagedPublicId = (publicId) => {
  if (typeof publicId !== "string" || !publicId) {
    return false;
  }

  const folder = getFolder();
  return publicId === folder || publicId.startsWith(`${folder}/`);
};

const resolveManagedId = (url, publicId) => {
  const fromUrl = publicIdFromCloudinaryUrl(url);

  if (fromUrl && isManagedPublicId(fromUrl)) {
    return fromUrl;
  }

  if (url) {
    return null;
  }

  if (typeof publicId === "string" && isManagedPublicId(publicId)) {
    return publicId;
  }

  return null;
};

const collectManagedIds = (value, ids = new Set()) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectManagedIds(item, ids));
    return ids;
  }

  if (!isPlainObject(value)) {
    return ids;
  }

  const handled = new Set();

  for (const key of Object.keys(value)) {
    if (!key.endsWith("PublicId")) {
      continue;
    }

    const base = key.slice(0, -"PublicId".length);
    handled.add(key);
    handled.add(base);
    const resolved = resolveManagedId(value[base], value[key]);

    if (resolved) {
      ids.add(resolved);
    }
  }

  for (const [key, nested] of Object.entries(value)) {
    if (handled.has(key)) {
      continue;
    }

    if (typeof nested === "string") {
      const fromUrl = publicIdFromCloudinaryUrl(nested);
      if (fromUrl && isManagedPublicId(fromUrl)) {
        ids.add(fromUrl);
      }
      continue;
    }

    collectManagedIds(nested, ids);
  }

  return ids;
};

const normalizeManagedImages = (value) => {
  if (Array.isArray(value)) {
    value.forEach((item) => normalizeManagedImages(item));
    return value;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  for (const key of Object.keys(value)) {
    if (!key.endsWith("PublicId")) {
      continue;
    }

    const base = key.slice(0, -"PublicId".length);
    value[key] = resolveManagedId(value[base], value[key]) || "";
  }

  for (const [key, nested] of Object.entries(value)) {
    if (key === "image" || key === "logo") {
      const fromUrl = publicIdFromCloudinaryUrl(nested);
      if (fromUrl && isManagedPublicId(fromUrl)) {
        value[`${key}PublicId`] = fromUrl;
      } else if (Object.prototype.hasOwnProperty.call(value, key) && !value[`${key}PublicId`]) {
        value[`${key}PublicId`] = "";
      }
      continue;
    }

    if (isPlainObject(nested) || Array.isArray(nested)) {
      normalizeManagedImages(nested);
    }
  }

  return value;
};

const removedManagedIds = (previous, next) => {
  const before = collectManagedIds(previous);
  const after = collectManagedIds(next);
  return [...before].filter((publicId) => !after.has(publicId));
};

const uploadBuffer = (buffer, options) => {
  const client = getClient();

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
    stream.end(buffer);
  });
};

const uploadImage = async ({ buffer, sectionKey }) => {
  const folder = sectionKey ? `${getFolder()}/${sectionKey}` : getFolder();

  let result;

  try {
    result = await uploadBuffer(buffer, {
      folder,
      resource_type: "image",
      unique_filename: true,
      overwrite: false,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Cloudinary upload failed:", error.message);
    throw new ApiError(502, "Cloudinary request failed");
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
};

const deleteManagedImages = async (publicIds) => {
  const ids = [...new Set(publicIds)].filter((publicId) => isManagedPublicId(publicId));

  if (ids.length === 0) {
    return [];
  }

  if (!isConfigured()) {
    throw new ApiError(500, "Cloudinary is not configured");
  }

  const client = getClient();

  try {
    for (let index = 0; index < ids.length; index += 100) {
      const group = ids.slice(index, index + 100);
      const result = await client.api.delete_resources(group, { resource_type: "image" });
      const deleted = result.deleted || {};
      const failed = Object.entries(deleted).filter(([, status]) => status !== "deleted" && status !== "not_found");

      if (failed.length > 0 || result.partial) {
        throw new Error("Cloudinary could not delete every image");
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Cloudinary delete failed:", error.message);
    throw new ApiError(502, "Cloudinary request failed");
  }

  return ids;
};

const deleteImage = async ({ publicId, url }) => {
  const resolved = url ? resolveManagedId(url, publicId) : isManagedPublicId(publicId) ? publicId : null;

  if (!resolved) {
    throw new ApiError(400, "A landing page Cloudinary image is required");
  }

  await deleteManagedImages([resolved]);
  return { publicId: resolved };
};

module.exports = {
  publicIdFromCloudinaryUrl,
  isManagedPublicId,
  collectManagedIds,
  normalizeManagedImages,
  removedManagedIds,
  uploadImage,
  deleteManagedImages,
  deleteImage,
};
