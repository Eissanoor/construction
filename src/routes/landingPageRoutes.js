const express = require("express");
const controller = require("../controllers/landingPageController");
const { validate, requireSectionKey } = require("../middleware/validate");
const requireAuth = require("../middleware/requireAuth");
const {
  validateCreate,
  validateUpdate,
  validateReorder,
  validateStatus,
} = require("../validators/landingPageValidator");

const adminRouter = express.Router();
const publicRouter = express.Router();

adminRouter.use(requireAuth);

adminRouter.get("/config", controller.getEditorConfig);
adminRouter.patch("/reorder", validate((req) => validateReorder(req.body)), controller.reorderSections);
adminRouter.get("/", controller.getSections);
adminRouter.post("/", validate((req) => validateCreate(req.body)), controller.createSection);
adminRouter.get("/:sectionKey", requireSectionKey, controller.getSection);
adminRouter.put(
  "/:sectionKey",
  requireSectionKey,
  validate((req) => validateUpdate(req.params.sectionKey, req.body)),
  controller.updateSection
);
adminRouter.delete("/:sectionKey", requireSectionKey, controller.deleteSection);
adminRouter.patch(
  "/:sectionKey/status",
  requireSectionKey,
  validate((req) => validateStatus(req.body)),
  controller.updateSectionStatus
);

publicRouter.get("/", controller.getPublicLandingPage);

module.exports = { adminRouter, publicRouter };
