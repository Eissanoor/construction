const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const landingPageService = require("../services/landingPageService");

const createSection = asyncHandler(async (req, res) => {
  const section = await landingPageService.createSection(req.validated);
  return sendSuccess(res, 201, "Landing page section created successfully", section);
});

const getSections = asyncHandler(async (req, res) => {
  const sections = await landingPageService.getSections();
  return sendSuccess(res, 200, "Landing page sections fetched successfully", sections);
});

const getSection = asyncHandler(async (req, res) => {
  const section = await landingPageService.getSectionByKey(req.params.sectionKey);
  return sendSuccess(res, 200, "Landing page section fetched successfully", section);
});

const updateSection = asyncHandler(async (req, res) => {
  const section = await landingPageService.updateSection(req.params.sectionKey, req.validated);
  return sendSuccess(res, 200, "Landing page section updated successfully", section);
});

const deleteSection = asyncHandler(async (req, res) => {
  const section = await landingPageService.deleteSection(req.params.sectionKey);
  return sendSuccess(res, 200, "Landing page section deleted successfully", section);
});

const updateSectionStatus = asyncHandler(async (req, res) => {
  const hasIsActive = Object.prototype.hasOwnProperty.call(req.validated, "isActive");
  const section = await landingPageService.updateSectionStatus(
    req.params.sectionKey,
    hasIsActive ? req.validated.isActive : undefined
  );
  return sendSuccess(res, 200, "Landing page section status updated successfully", section);
});

const reorderSections = asyncHandler(async (req, res) => {
  const sections = await landingPageService.reorderSections(req.validated.sections);
  return sendSuccess(res, 200, "Landing page sections reordered successfully", sections);
});

const getEditorConfig = asyncHandler(async (req, res) => {
  const config = landingPageService.getEditorConfig();
  return sendSuccess(res, 200, "Landing page editor config fetched successfully", config);
});

const getPublicLandingPage = asyncHandler(async (req, res) => {
  const sections = await landingPageService.getPublicLandingPage();
  return sendSuccess(res, 200, "Landing page fetched successfully", sections);
});

module.exports = {
  createSection,
  getSections,
  getSection,
  updateSection,
  deleteSection,
  updateSectionStatus,
  reorderSections,
  getEditorConfig,
  getPublicLandingPage,
};
