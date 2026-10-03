const { assertSectionKey } = require("../validators/landingPageValidator");

const validate = (validateFn) => (req, res, next) => {
  try {
    req.validated = validateFn(req);
    next();
  } catch (error) {
    next(error);
  }
};

const requireSectionKey = (req, res, next) => {
  try {
    assertSectionKey(req.params.sectionKey);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validate, requireSectionKey };
