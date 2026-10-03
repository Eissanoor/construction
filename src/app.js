const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { adminRouter, publicRouter } = require("./routes/landingPageRoutes");
const uploadRouter = require("./routes/uploadRoutes");
const authRouter = require("./routes/authRoutes");
const errorHandler = require("./middleware/errorHandler");
const { sendError } = require("./utils/apiResponse");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  return res.status(connected ? 200 : 503).json({
    status: connected,
    message: connected ? "Server is running" : "Database is unavailable",
    data: { database: connected ? "connected" : "disconnected" },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/landing-page", adminRouter);
app.use("/api/public/landing-page", publicRouter);
app.use("/api/uploads", uploadRouter);

app.use((req, res) => {
  return sendError(res, 404, "Route not found");
});

app.use(errorHandler);

module.exports = app;
