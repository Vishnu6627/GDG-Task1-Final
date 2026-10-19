require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const readingsRouter = require("./routes/readings");
const rulesRouter = require("./routes/rules");
const alertsRouter = require("./routes/alerts");
const Reading = require("./models/Reading");
const Alert = require("./models/Alert");
const AlertRule = require("./models/AlertRule");
const path = require("path");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/stats", async (req, res, next) => {
  try {
    const [readings, sensors, openAlerts, rules, recentReadings] = await Promise.all([
      Reading.countDocuments(),
      Reading.distinct("sensorId"),
      Alert.countDocuments({ status: "open" }),
      AlertRule.countDocuments({ enabled: true }),
      Reading.find().sort({ timestamp: -1 }).limit(8).lean()
    ]);
    res.json({ readings, sensors: sensors.length, openAlerts, rules, recentReadings });
  } catch (error) { next(error); }
});

app.get("/health", (req, res) => {
  res.json({
    server: "running",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.use("/api/readings", readingsRouter);
app.use("/api/rules", rulesRouter);
app.use("/api/alerts", alertsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found", path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  if (err.name === "ValidationError" || err.name === "CastError") {
    return res.status(400).json({ error: err.message });
  }
  return res.status(err.status || 500).json({
    error: err.message || "Internal server error"
  });
});

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing. Add it to your .env file.");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;