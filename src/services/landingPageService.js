const LandingPage = require("../models/LandingPage");
const ApiError = require("../utils/ApiError");
const { getEditorConfig } = require("../config/sectionConfig");

const createSection = async (payload) => {
  const exists = await LandingPage.exists({ sectionKey: payload.sectionKey });

  if (exists) {
    throw new ApiError(409, "Landing page section already exists");
  }

  const section = await LandingPage.create(payload);
  return section.toObject();
};

const getSections = async () => {
  return LandingPage.find().sort({ order: 1, sectionKey: 1 }).lean();
};

const getSectionByKey = async (sectionKey) => {
  const section = await LandingPage.findOne({ sectionKey }).lean();

  if (!section) {
    throw new ApiError(404, "Landing page section not found");
  }

  return section;
};

const updateSection = async (sectionKey, payload) => {
  const section = await LandingPage.findOneAndUpdate(
    { sectionKey },
    { $set: payload },
    { new: true, runValidators: true }
  ).lean();

  if (!section) {
    throw new ApiError(404, "Landing page section not found");
  }

  return section;
};

const deleteSection = async (sectionKey) => {
  const section = await LandingPage.findOneAndDelete({ sectionKey }).lean();

  if (!section) {
    throw new ApiError(404, "Landing page section not found");
  }

  return section;
};

const updateSectionStatus = async (sectionKey, isActive) => {
  const section = await LandingPage.findOne({ sectionKey });

  if (!section) {
    throw new ApiError(404, "Landing page section not found");
  }

  section.isActive = typeof isActive === "boolean" ? isActive : !section.isActive;
  await section.save();
  return section.toObject();
};

const reorderSections = async (sections) => {
  const keys = sections.map((section) => section.sectionKey);
  const existing = await LandingPage.find({ sectionKey: { $in: keys } })
    .select("sectionKey")
    .lean();
  const existingKeys = new Set(existing.map((section) => section.sectionKey));
  const missing = keys.filter((key) => !existingKeys.has(key));

  if (missing.length > 0) {
    throw new ApiError(404, `Landing page section not found: ${missing.join(", ")}`);
  }

  const updatedAt = new Date();
  const result = await LandingPage.bulkWrite(
    sections.map((section) => ({
      updateOne: {
        filter: { sectionKey: section.sectionKey },
        update: { $set: { order: section.order, updatedAt } },
      },
    }))
  );

  if (result.matchedCount !== sections.length) {
    throw new ApiError(404, "Landing page section not found");
  }

  return getSections();
};

const getPublicLandingPage = async () => {
  return LandingPage.find({ isActive: true }).sort({ order: 1, sectionKey: 1 }).lean();
};

module.exports = {
  createSection,
  getSections,
  getSectionByKey,
  updateSection,
  deleteSection,
  updateSectionStatus,
  reorderSections,
  getPublicLandingPage,
  getEditorConfig,
};
