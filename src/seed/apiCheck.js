const mongoose = require("mongoose");

const uri = "mongodb://127.0.0.1:27017/construction_site_cms_test";

const assert = (condition, message, extra) => {
  if (!condition) {
    const error = new Error(message);
    error.extra = extra;
    throw error;
  }
  console.log(`OK ${message}`);
};

const start = async () => {
  await mongoose.connect(uri);
  const app = require("../app");
  const LandingPage = require("../models/LandingPage");
  await LandingPage.deleteMany({});

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const request = async (method, path, body, { raw = false } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: raw ? body : body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json();
    return { status: response.status, json };
  };

  try {
    const health = await request("GET", "/api/health");
    assert(health.status === 200 && health.json.status === true, "health check");

    const empty = await request("GET", "/api/landing-page");
    assert(empty.status === 200 && empty.json.status === true && empty.json.data.length === 0, "empty admin list");

    const missingTitle = await request("POST", "/api/landing-page", {
      sectionKey: "hero",
      sectionName: "Hero",
      order: 1,
    });
    assert(missingTitle.status === 400 && missingTitle.json.status === false, "hero title is required", missingTitle.json);

    const invalidKey = await request("POST", "/api/landing-page", {
      sectionKey: "section_1",
      sectionName: "Section 1",
      order: 1,
    });
    assert(invalidKey.status === 400 && invalidKey.json.message === "Invalid section key", "rejects numbered section keys");

    const htmlField = await request("POST", "/api/landing-page", {
      sectionKey: "hero",
      sectionName: "Hero",
      order: 1,
      title: "Hello",
      html: "<Hero />",
    });
    assert(htmlField.status === 400, "rejects component markup at the top level");

    const created = await request("POST", "/api/landing-page", {
      sectionKey: "services",
      sectionName: "Services",
      order: 3,
      title: "Full-spectrum construction",
      description: "Professional construction services.",
      items: [
        {
          number: "01",
          title: "Commercial Construction",
          description: "Offices, retail and mixed-use buildings.",
          image: "/uploads/commercial.jpg",
        },
        {
          number: "02",
          title: "Residential Construction",
          description: "Professional residential construction.",
          image: "/uploads/residential.jpg",
        },
      ],
    });
    assert(created.status === 201 && created.json.status === true, "creates services", created.json);
    assert(created.json.data.sectionKey === "services", "stores sectionKey");
    assert(created.json.data.items.length === 2, "stores service items");
    assert(created.json.data.isActive === true, "defaults to active");
    assert(created.json.data.__v === undefined, "hides version key");
    assert(!created.json.data.html, "does not store markup");

    const duplicate = await request("POST", "/api/landing-page", {
      sectionKey: "services",
      sectionName: "Services",
      order: 3,
      title: "Again",
    });
    assert(duplicate.status === 409 && duplicate.json.data === null, "duplicate sectionKey returns 409");

    const fetched = await request("GET", "/api/landing-page/services");
    assert(
      fetched.status === 200 && fetched.json.message === "Landing page section fetched successfully",
      "fetches one section"
    );
    assert(fetched.json.data.items[0].title === "Commercial Construction", "returns item content");

    const unknown = await request("GET", "/api/landing-page/section_1");
    assert(unknown.status === 400 && unknown.json.message === "Invalid section key", "unknown key is invalid");

    const missing = await request("GET", "/api/landing-page/hero");
    assert(missing.status === 404 && missing.json.message === "Landing page section not found", "missing section is 404");

    const updated = await request("PUT", "/api/landing-page/services", {
      _id: fetched.json.data._id,
      sectionKey: "services",
      createdAt: fetched.json.data.createdAt,
      title: "Our services",
      items: [
        {
          number: "01",
          title: "Commercial Construction",
          description: "Offices, retail and mixed-use buildings.",
          image: "/uploads/commercial.jpg",
        },
      ],
    });
    assert(updated.status === 200 && updated.json.data.title === "Our services", "updates services", updated.json);
    assert(updated.json.data.items.length === 1, "replaces items");
    assert(
      updated.json.data.description === "Professional construction services.",
      "keeps omitted description"
    );

    const changedKey = await request("PUT", "/api/landing-page/services", { sectionKey: "hero" });
    assert(changedKey.status === 400 && changedKey.json.message === "sectionKey cannot be changed", "sectionKey is immutable");

    const hidden = await request("PATCH", "/api/landing-page/services/status", { isActive: false });
    assert(hidden.status === 200 && hidden.json.data.isActive === false, "sets section inactive");

    const toggled = await request("PATCH", "/api/landing-page/services/status", {});
    assert(toggled.status === 200 && toggled.json.data.isActive === true, "toggles section back to active");

    await request("POST", "/api/landing-page", {
      sectionKey: "header",
      sectionName: "Header",
      order: 0,
      items: [{ label: "Services", link: "#services" }],
      settings: { phone: "+1 (000) 000-0000", email: "hello@example.com" },
    });
    await request("POST", "/api/landing-page", {
      sectionKey: "hero",
      sectionName: "Hero",
      order: 1,
      title: "Building spaces that last",
      subtitle: "Commercial and residential construction",
      button: { text: "Start a project", link: "#contact" },
    });
    await request("POST", "/api/landing-page", {
      sectionKey: "about",
      sectionName: "About",
      order: 2,
      title: "About the company",
    });

    const reordered = await request("PATCH", "/api/landing-page/reorder", {
      sections: [
        { sectionKey: "hero", order: 2 },
        { sectionKey: "about", order: 1 },
      ],
    });
    assert(reordered.status === 200, "reorders sections", reordered.json);
    const order = reordered.json.data.map((section) => `${section.sectionKey}:${section.order}`);
    assert(
      order.join(",") === "header:0,about:1,hero:2,services:3",
      "returns sections sorted by order",
      order
    );

    const duplicateOrder = await request("PATCH", "/api/landing-page/reorder", {
      sections: [
        { sectionKey: "hero", order: 1 },
        { sectionKey: "about", order: 1 },
      ],
    });
    assert(duplicateOrder.status === 400, "rejects duplicate order values");

    const missingReorder = await request("PATCH", "/api/landing-page/reorder", {
      sections: [{ sectionKey: "footer", order: 4 }],
    });
    assert(missingReorder.status === 404 && missingReorder.json.data === null, "reorder reports a missing section");

    const badTestimonial = await request("POST", "/api/landing-page", {
      sectionKey: "testimonials",
      sectionName: "Testimonials",
      order: 7,
      title: "Client notes",
      items: [{ name: "John Doe", company: "ABC Company" }],
    });
    assert(badTestimonial.status === 400, "testimonial message is required");

    await request("POST", "/api/landing-page", {
      sectionKey: "testimonials",
      sectionName: "Testimonials",
      order: 7,
      title: "Client notes",
      items: [
        {
          name: "John Doe",
          position: "CEO",
          company: "ABC Company",
          message: "Excellent service.",
          image: "/uploads/john.jpg",
        },
      ],
    });

    await request("PATCH", "/api/landing-page/testimonials/status", { isActive: false });

    const published = await request("GET", "/api/public/landing-page");
    assert(
      published.status === 200 && published.json.message === "Landing page fetched successfully",
      "fetches the public page"
    );
    const publicKeys = published.json.data.map((section) => section.sectionKey);
    assert(!publicKeys.includes("testimonials"), "public API hides inactive sections", publicKeys);
    assert(
      publicKeys.join(",") === "header,about,hero,services",
      "public API follows order",
      publicKeys
    );
    assert(published.json.data[0].items[0].label === "Services", "public API returns section content");

    const config = await request("GET", "/api/landing-page/config");
    assert(config.status === 200 && config.json.data.length === 11, "returns editor config for every section");
    const servicesConfig = config.json.data.find((section) => section.sectionKey === "services");
    assert(
      servicesConfig.fields.some((field) => field.component === "SortableItems"),
      "services config drives the items editor"
    );

    const removed = await request("DELETE", "/api/landing-page/services");
    assert(removed.status === 200 && removed.json.data.sectionKey === "services", "deletes a section");
    const gone = await request("GET", "/api/landing-page/services");
    assert(gone.status === 404, "deleted section is not found");

    const badJson = await request("POST", "/api/landing-page", "{", { raw: true });
    assert(badJson.status === 400 && badJson.json.message === "Invalid JSON body", "rejects invalid JSON", badJson.json);

    const missingRoute = await request("GET", "/api/unknown");
    assert(missingRoute.status === 404 && missingRoute.json.message === "Route not found", "unknown route");

    console.log("API checks passed.");
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
};

start().catch((error) => {
  console.error(error.message);
  if (error.extra) {
    console.error(JSON.stringify(error.extra, null, 2));
  }
  mongoose.connection.close().finally(() => process.exit(1));
});
