const Joi = require("joi");

/**
 * Built-in landing-page sections.
 *
 * Header, hero, about, and the other keys below keep their own fields.
 * Any other slug, such as faq, is stored with the shared landing fields
 * (title, description, image, button, items, settings).
 *
 * GET /api/landing-page/config lists the built-in sections only.
 * Section documents stay in the LandingPage collection.
 */

const text = (name, label, extra = {}) => ({
  name,
  component: "TextField",
  label,
  ...extra,
});

const rich = (name, label, extra = {}) => ({
  name,
  component: "RichTextEditor",
  label,
  ...extra,
});

const image = (name, label, extra = {}) => ({
  name,
  component: "ImageUploader",
  label,
  uploadEndpoint: "/api/uploads",
  uploadField: "image",
  publicIdField: `${name}PublicId`,
  ...extra,
});

const button = (label = "Button") => ({
  name: "button",
  component: "ButtonEditor",
  label,
});

const items = (label, itemFields) => ({
  name: "items",
  component: "SortableItems",
  label,
  sortable: true,
  itemFields,
});

const settings = (label, fields) => ({
  name: "settings",
  component: "SectionSettings",
  label,
  fields,
});

const headerItemSchema = Joi.object({
  label: Joi.string().trim().min(1).max(120).required(),
  link: Joi.string().trim().min(1).max(2000).required(),
}).unknown(true);

const aboutItemSchema = Joi.object({
  title: Joi.string().trim().min(1).max(120).required(),
  value: Joi.string().trim().allow("").max(60),
  description: Joi.string().allow("").max(1000),
}).unknown(true);

const serviceItemSchema = Joi.object({
  number: Joi.string().trim().allow("").max(20),
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow("").max(5000),
  image: Joi.string().trim().allow("").max(4000),
}).unknown(true);

const projectItemSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow("").max(5000),
  image: Joi.string().trim().allow("").max(4000),
  category: Joi.string().trim().allow("").max(120),
  link: Joi.string().trim().allow("").max(2000),
}).unknown(true);

const whyUsItemSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow("").max(5000),
  icon: Joi.string().trim().allow("").max(120),
}).unknown(true);

const processItemSchema = Joi.object({
  number: Joi.string().trim().allow("").max(20),
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow("").max(5000),
}).unknown(true);

const testimonialItemSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  position: Joi.string().trim().allow("").max(120),
  company: Joi.string().trim().allow("").max(160),
  message: Joi.string().min(1).max(5000).required(),
  image: Joi.string().trim().allow("").max(4000),
}).unknown(true);

const contactItemSchema = Joi.object({
  label: Joi.string().trim().min(1).max(120).required(),
  value: Joi.string().trim().min(1).max(500).required(),
  type: Joi.string().trim().allow("").max(50),
}).unknown(true);

const footerItemSchema = Joi.object({
  label: Joi.string().trim().min(1).max(120).required(),
  link: Joi.string().trim().min(1).max(2000).required(),
  group: Joi.string().trim().allow("").max(80),
}).unknown(true);

const headerSettingsSchema = Joi.object({
  logo: Joi.string().trim().allow("").max(4000),
  phone: Joi.string().trim().allow("").max(50),
  email: Joi.string().trim().allow("").max(200),
}).unknown(true);

const contactSettingsSchema = Joi.object({
  email: Joi.string().trim().allow("").max(200),
  phone: Joi.string().trim().allow("").max(50),
  address: Joi.string().trim().allow("").max(500),
  hours: Joi.string().trim().allow("").max(200),
  mapUrl: Joi.string().trim().allow("").max(2000),
}).unknown(true);

const footerSettingsSchema = Joi.object({
  copyright: Joi.string().trim().allow("").max(300),
  logo: Joi.string().trim().allow("").max(4000),
}).unknown(true);

const SECTION_DEFINITIONS = {
  header: {
    sectionKey: "header",
    sectionName: "Header",
    defaultOrder: 0,
    requiredOnCreate: [],
    itemSchema: headerItemSchema,
    settingsSchema: headerSettingsSchema,
    fields: [
      items("Navigation", [text("label", "Label", { required: true }), text("link", "Link", { required: true })]),
      button("Header button"),
      settings("Header settings", [
        image("logo", "Logo"),
        text("phone", "Phone"),
        text("email", "Email"),
      ]),
    ],
  },
  hero: {
    sectionKey: "hero",
    sectionName: "Hero",
    defaultOrder: 1,
    requiredOnCreate: ["title"],
    fields: [
      text("title", "Title", { required: true }),
      text("subtitle", "Subtitle"),
      rich("description", "Description"),
      image("image", "Image"),
      button(),
    ],
  },
  about: {
    sectionKey: "about",
    sectionName: "About",
    defaultOrder: 2,
    requiredOnCreate: ["title"],
    itemSchema: aboutItemSchema,
    fields: [
      text("title", "Title", { required: true }),
      text("subtitle", "Subtitle"),
      rich("description", "Description"),
      image("image", "Image"),
      button(),
      items("Highlights", [
        text("title", "Label", { required: true }),
        text("value", "Value"),
        rich("description", "Description"),
      ]),
    ],
  },
  services: {
    sectionKey: "services",
    sectionName: "Services",
    defaultOrder: 3,
    requiredOnCreate: ["title"],
    itemSchema: serviceItemSchema,
    fields: [
      text("title", "Title", { required: true }),
      rich("description", "Description"),
      items("Services", [
        text("number", "Number"),
        text("title", "Title", { required: true }),
        rich("description", "Description"),
        image("image", "Image"),
      ]),
    ],
  },
  projects: {
    sectionKey: "projects",
    sectionName: "Projects",
    defaultOrder: 4,
    requiredOnCreate: ["title"],
    itemSchema: projectItemSchema,
    fields: [
      text("title", "Title", { required: true }),
      rich("description", "Description"),
      items("Projects", [
        text("title", "Title", { required: true }),
        text("category", "Category"),
        rich("description", "Description"),
        image("image", "Image"),
        text("link", "Link"),
      ]),
    ],
  },
  "why-us": {
    sectionKey: "why-us",
    sectionName: "Why Us",
    defaultOrder: 5,
    requiredOnCreate: ["title"],
    itemSchema: whyUsItemSchema,
    fields: [
      text("title", "Title", { required: true }),
      rich("description", "Description"),
      items("Reasons", [
        text("icon", "Icon"),
        text("title", "Title", { required: true }),
        rich("description", "Description"),
      ]),
    ],
  },
  process: {
    sectionKey: "process",
    sectionName: "Process",
    defaultOrder: 6,
    requiredOnCreate: ["title"],
    itemSchema: processItemSchema,
    fields: [
      text("title", "Title", { required: true }),
      rich("description", "Description"),
      items("Steps", [
        text("number", "Number"),
        text("title", "Title", { required: true }),
        rich("description", "Description"),
      ]),
    ],
  },
  testimonials: {
    sectionKey: "testimonials",
    sectionName: "Testimonials",
    defaultOrder: 7,
    requiredOnCreate: ["title"],
    itemSchema: testimonialItemSchema,
    fields: [
      text("title", "Title", { required: true }),
      rich("description", "Description"),
      items("Testimonials", [
        text("name", "Name", { required: true }),
        text("position", "Position"),
        text("company", "Company"),
        rich("message", "Message", { required: true }),
        image("image", "Image"),
      ]),
    ],
  },
  cta: {
    sectionKey: "cta",
    sectionName: "CTA",
    defaultOrder: 8,
    requiredOnCreate: ["title"],
    fields: [
      text("title", "Title", { required: true }),
      text("subtitle", "Subtitle"),
      rich("description", "Description"),
      image("image", "Image"),
      button(),
    ],
  },
  contact: {
    sectionKey: "contact",
    sectionName: "Contact",
    defaultOrder: 9,
    requiredOnCreate: ["title"],
    itemSchema: contactItemSchema,
    settingsSchema: contactSettingsSchema,
    fields: [
      text("title", "Title", { required: true }),
      rich("description", "Description"),
      settings("Contact details", [
        text("email", "Email"),
        text("phone", "Phone"),
        text("address", "Address"),
        text("hours", "Hours"),
        text("mapUrl", "Map URL"),
      ]),
      items("Contact channels", [
        text("label", "Label", { required: true }),
        text("value", "Value", { required: true }),
        text("type", "Type"),
      ]),
    ],
  },
  footer: {
    sectionKey: "footer",
    sectionName: "Footer",
    defaultOrder: 10,
    requiredOnCreate: [],
    itemSchema: footerItemSchema,
    settingsSchema: footerSettingsSchema,
    fields: [
      rich("description", "Description"),
      items("Links", [
        text("group", "Group"),
        text("label", "Label", { required: true }),
        text("link", "Link", { required: true }),
      ]),
      settings("Footer settings", [image("logo", "Logo"), text("copyright", "Copyright")]),
    ],
  },
};

for (const [key, definition] of Object.entries(SECTION_DEFINITIONS)) {
  if (definition.sectionKey !== key) {
    throw new Error(`Section config key mismatch for ${key}`);
  }
}

const SECTION_KEYS = Object.freeze(Object.keys(SECTION_DEFINITIONS));

const RESERVED_SECTION_KEYS = new Set(["config", "reorder", "sections", "new"]);

const SECTION_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const isAllowedSectionKey = (sectionKey) => {
  if (typeof sectionKey !== "string") return false;

  const key = sectionKey.trim().toLowerCase();

  if (key.length < 1 || key.length > 40) return false;
  if (RESERVED_SECTION_KEYS.has(key)) return false;

  return SECTION_KEY_PATTERN.test(key);
};

const getEditorConfig = () => {
  return Object.values(SECTION_DEFINITIONS)
    .map((section) => ({
      sectionKey: section.sectionKey,
      sectionName: section.sectionName,
      defaultOrder: section.defaultOrder,
      fields: [
        {
          name: "sectionName",
          component: "TextField",
          label: "Section name",
          required: true,
        },
        ...section.fields,
      ],
    }))
    .sort((left, right) => left.defaultOrder - right.defaultOrder);
};

module.exports = {
  SECTION_KEYS,
  SECTION_DEFINITIONS,
  RESERVED_SECTION_KEYS,
  isAllowedSectionKey,
  getEditorConfig,
};
