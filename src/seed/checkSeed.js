const assert = require("assert");
const defaultSections = require("./defaultSections");
const { SECTION_KEYS } = require("../config/sectionConfig");
const { validateCreate, validateUpdate, validateReorder, validateStatus } = require("../validators/landingPageValidator");
const {
  publicIdFromCloudinaryUrl,
  normalizeManagedImages,
  removedManagedIds,
  collectManagedIds,
} = require("../services/mediaService");

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

const previousCloud = process.env.CLOUDINARY_CLOUD_NAME;
const previousFolder = process.env.CLOUDINARY_FOLDER;
process.env.CLOUDINARY_CLOUD_NAME = "demo";
process.env.CLOUDINARY_FOLDER = "landing-page";

const cloudinaryUrl = (publicId) => `https://res.cloudinary.com/demo/image/upload/v1/${publicId}.jpg`;

assert.equal(publicIdFromCloudinaryUrl(cloudinaryUrl("landing-page/hero/house")), "landing-page/hero/house");
assert.equal(
  publicIdFromCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/c_fill,w_400/v12/landing-page/services/site.png"),
  "landing-page/services/site"
);
assert.equal(publicIdFromCloudinaryUrl("/uploads/commercial.jpg"), null);
assert.equal(publicIdFromCloudinaryUrl("https://res.cloudinary.com/other/image/upload/v1/landing-page/hero/house.jpg"), null);

const stored = {
  image: cloudinaryUrl("landing-page/hero/old"),
  imagePublicId: "landing-page/hero/old",
  items: [
    { title: "Keep", image: cloudinaryUrl("landing-page/services/keep") },
    { title: "Drop", image: "https://res.cloudinary.com/demo/image/upload/c_fill,w_200/v9/landing-page/services/drop.jpg" },
  ],
  settings: { logo: cloudinaryUrl("landing-page/header/logo") },
};
const edited = {
  ...stored,
  title: "Updated",
  items: [{ title: "Keep", image: cloudinaryUrl("landing-page/services/keep") }],
  settings: { logo: "" },
};

assert.deepStrictEqual(removedManagedIds(stored, { ...stored, title: "Hi" }), []);
assert.deepStrictEqual(removedManagedIds(stored, edited).sort(), ["landing-page/header/logo", "landing-page/services/drop"]);

const uploaded = { image: cloudinaryUrl("landing-page/hero/new") };
normalizeManagedImages(uploaded);
assert.equal(uploaded.imagePublicId, "landing-page/hero/new");

const outside = { image: "https://res.cloudinary.com/demo/image/upload/v1/other-folder/pic.jpg" };
normalizeManagedImages(outside);
assert.equal(outside.imagePublicId, "");
assert.equal(collectManagedIds(outside).size, 0);

const restoreEnv = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

restoreEnv("CLOUDINARY_CLOUD_NAME", previousCloud);
restoreEnv("CLOUDINARY_FOLDER", previousFolder);

console.log(`Validated ${defaultSections.length} landing page sections.`);
