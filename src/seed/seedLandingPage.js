require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const LandingPage = require("../models/LandingPage");
const defaultSections = require("./defaultSections");
const { validateCreate } = require("../validators/landingPageValidator");

const seed = async () => {
  const force = process.argv.includes("--force");

  await connectDB();

  const count = await LandingPage.countDocuments();
  if (count > 0 && !force) {
    console.log(`Landing page already has ${count} section(s). Re-run with --force to overwrite.`);
    return;
  }

  const sections = defaultSections.map((section) => validateCreate(section));

  if (force) {
    await LandingPage.deleteMany({});
  }

  await LandingPage.insertMany(sections);
  console.log(`Seeded ${sections.length} landing page sections.`);
};

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
