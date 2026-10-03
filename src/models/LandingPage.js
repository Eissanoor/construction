const mongoose = require("mongoose");
const { SECTION_KEYS } = require("../config/sectionConfig");

const landingPageSchema = new mongoose.Schema(
  {
    sectionKey: {
      type: String,
      required: true,
      unique: true,
      enum: SECTION_KEYS,
      immutable: true,
      trim: true,
    },
    sectionName: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    imagePublicId: {
      type: String,
      default: "",
      trim: true,
    },
    button: {
      text: {
        type: String,
        default: "",
        trim: true,
      },
      link: {
        type: String,
        default: "",
        trim: true,
      },
    },
    items: {
      type: Array,
      default: [],
    },
    settings: {
      type: Object,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
    versionKey: false,
    collection: "landingpages",
  }
);

landingPageSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model("LandingPage", landingPageSchema);
