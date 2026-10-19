const express = require("express");
const Reading = require("../models/Reading");
const AlertRule = require("../models/AlertRule");
const Alert = require("../models/Alert");
const { evaluateReading, matchesCondition } = require("../services/alertService");

const router = express.Router();

function validateReading(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return "Each reading must be an object";
  }
  if (typeof item.sensorId !== "string" || !item.sensorId.trim()) {
    return "sensorId must be a non-empty string";
  }
  if (typeof item.type !== "string" || !item.type.trim()) {
    return "type must be a non-empty string";
  }
  if (typeof item.value !== "number" || !Number.isFinite(item.value)) {
    return "value must be a finite number";
  }
  if (item.timestamp !== undefined) {
    const parsed = new Date(item.timestamp);
    if (Number.isNaN(parsed.getTime())) return "timestamp must be a valid date";
  }
  return null;
}

function normalizeReading(item) {
  return {
    sensorId: item.sensorId.trim(),
    type: item.type.trim().toLowerCase(),
    value: item.value,
    timestamp: item.timestamp === undefined ? new Date() : new Date(item.timestamp)
  };
}

router.post("/", async (req, res, next) => {
  try {
    const error = validateReading(req.body);
    if (error) return res.status(400).json({ error });

    const reading = await Reading.create(normalizeReading(req.body));
    const alerts = await evaluateReading(reading);
    return res.status(201).json({ reading, alerts });
  } catch (error) {
    return next(error);
  }
});

router.post("/batch", async (req, res, next) => {
  try {
    const readings = req.body && req.body.readings;

    if (!Array.isArray(readings) || readings.length < 1 || readings.length > 10000) {
      return res.status(400).json({
        error: "readings must contain between 1 and 10000 items"
      });
    }

    const errors = [];
    for (let index = 0; index < readings.length; index++) {
      const error = validateReading(readings[index]);
      if (error) errors.push({ index, error });
    }

    if (errors.length) {
      return res.status(400).json({
        error: "Invalid readings",
        details: errors.slice(0, 20),
        totalErrors: errors.length
      });
    }

    const documents = readings.map(normalizeReading);
    const saved = await Reading.insertMany(documents, { ordered: true });

    const types = [...new Set(saved.map(item => item.type))];
    const rules = await AlertRule.find({ type: { $in: types }, enabled: true }).lean();
    const activeAlerts = rules.length
      ? await Alert.find({
          ruleId: { $in: rules.map(rule => rule._id) },
          status: { $in: ["open", "acknowledged"] }
        }).select("ruleId sensorId").lean()
      : [];

    const activeKeys = new Set(
      activeAlerts.map(alert => `${alert.ruleId}:${alert.sensorId}`)
    );
    const newAlerts = [];
    const readingsWithWindowRules = new Map();

    for (const reading of saved) {
      for (const rule of rules) {
        if (rule.type !== reading.type) continue;
        if (rule.sensorId && rule.sensorId !== reading.sensorId) continue;

        if (rule.windowMinutes > 0) {
          readingsWithWindowRules.set(String(reading._id), reading);
          continue;
        }

        if (!matchesCondition(reading.value, rule.condition, rule.threshold)) continue;

        const key = `${rule._id}:${reading.sensorId}`;
        if (activeKeys.has(key)) continue;

        activeKeys.add(key);
        newAlerts.push({
          ruleId: rule._id,
          sensorId: reading.sensorId,
          type: reading.type,
          value: reading.value,
          message: `${rule.name}: ${reading.type} value ${reading.value} ${rule.condition} ${rule.threshold}`,
          triggeredAt: reading.timestamp
        });
      }
    }

    if (newAlerts.length) {
      await Alert.insertMany(newAlerts, { ordered: false });
    }

    let windowAlertsCreated = 0;
    for (const reading of readingsWithWindowRules.values()) {
      const generated = await evaluateReading(reading);
      windowAlertsCreated += generated.length;
    }

    return res.status(201).json({
      received: readings.length,
      stored: saved.length,
      alertsCreated: newAlerts.length + windowAlertsCreated
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const parsedLimit = Number.parseInt(req.query.limit, 10) || 50;
    const limit = Math.min(Math.max(parsedLimit, 1), 500);
    const readings = await Reading.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    return res.json({ count: readings.length, readings });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;