const assert = require("assert");
const defaultSections = require("./defaultSections");
const { SECTION_KEYS } = require("../config/sectionConfig");
const { validateCreate, validateUpdate, validateReorder, validateStatus } = require("../validators/landingPageValidator");

const keys = defaultSections.map((section) => section.sectionKey);
assert.deepStrictEqual(keys, [...SECTION_KEYS]);

defaultSections.forEach((section) => validateCreate(section));

validateUpdate("services", {
  title: "Updated services",
  items: [
    {
      number: "01",
      title: "Commercial Construction",
      description: "Offices, retail, and mixed-use buildings.",
      image: "/uploads/commercial.jpg",
    },
  ],
});

validateReorder({
  sections: defaultSections.map((section) => ({
    sectionKey: section.sectionKey,
    order: section.order,
  })),
});

validateStatus({});
validateStatus({ isActive: false });

const hero = validateCreate({
  sectionKey: "hero",
  sectionName: "Hero",
  order: 1,
  title: "Welcome",
});
assert.equal(hero.button.text, "");
assert.equal(hero.button.link, "");

validateCreate({
  sectionKey: "services",
  sectionName: "Services",
  order: 3,
  title: "Services",
  description: "Professional construction services.",
  items: [],
});

assert.throws(
  () => validateCreate({ sectionKey: "hero", sectionName: "Hero", order: 1 }),
  (error) => error.statusCode === 400
);

assert.throws(
  () =>
    validateCreate({
      sectionKey: "hero",
      sectionName: "Hero",
      order: 1,
      title: "Hello",
      html: "<Hero />",
    }),
  (error) => error.statusCode === 400
);

assert.throws(() => validateUpdate("hero", {}), (error) => error.message === "No fields to update");

assert.throws(
  () =>
    validateReorder({
      sections: [
        { sectionKey: "hero", order: 1 },
        { sectionKey: "about", order: 1 },
      ],
    }),
  (error) => error.statusCode === 400
);

assert.throws(
  () =>
    validateReorder({
      sections: [
        { sectionKey: "hero", order: 1 },
        { sectionKey: "hero", order: 2 },
      ],
    }),
  (error) => error.statusCode === 400
);

console.log(`Validated ${defaultSections.length} landing page sections.`);
