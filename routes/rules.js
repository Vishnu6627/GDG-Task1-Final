const express = require("express");
const mongoose = require("mongoose");
const AlertRule = require("../models/AlertRule");

const router = express.Router();
const validConditions = ["gt", "gte", "lt", "lte", "eq"];

function validateRule(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object";
  }
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) return "name is required";
  }
  if (!partial || body.type !== undefined) {
    if (typeof body.type !== "string" || !body.type.trim()) return "type is required";
  }
  if (!partial || body.condition !== undefined) {
    if (!validConditions.includes(body.condition)) {
      return "condition must be one of: gt, gte, lt, lte, eq";
    }
  }
  if (!partial || body.threshold !== undefined) {
    if (typeof body.threshold !== "number" || !Number.isFinite(body.threshold)) {
      return "threshold must be a finite number";
    }
  }
  if (body.sensorId !== undefined && body.sensorId !== null &&
      (typeof body.sensorId !== "string" || !body.sensorId.trim())) {
    return "sensorId must be a non-empty string or null";
  }
  if (body.windowMinutes !== undefined &&
      (!Number.isFinite(body.windowMinutes) || body.windowMinutes < 0)) {
    return "windowMinutes must be a non-negative number";
  }
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
    return "enabled must be a boolean";
  }
  return null;
}

router.post("/", async (req, res, next) => {
  try {
    const error = validateRule(req.body);
    if (error) return res.status(400).json({ error });

    const rule = await AlertRule.create({
      name: req.body.name.trim(),
      type: req.body.type.trim().toLowerCase(),
      sensorId: req.body.sensorId === undefined || req.body.sensorId === null
        ? null : req.body.sensorId.trim(),
      condition: req.body.condition,
      threshold: req.body.threshold,
      windowMinutes: req.body.windowMinutes === undefined ? 0 : req.body.windowMinutes,
      enabled: req.body.enabled === undefined ? true : req.body.enabled
    });
    return res.status(201).json({ rule });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const rules = await AlertRule.find().sort({ createdAt: -1 }).lean();
    return res.json({ count: rules.length, rules });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }
    const error = validateRule(req.body, true);
    if (error) return res.status(400).json({ error });

    const updates = { ...req.body };
    if (updates.name !== undefined) updates.name = updates.name.trim();
    if (updates.type !== undefined) updates.type = updates.type.trim().toLowerCase();
    if (updates.sensorId !== undefined && typeof updates.sensorId === "string") {
      updates.sensorId = updates.sensorId.trim();
    }

    const rule = await AlertRule.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!rule) return res.status(404).json({ error: "Rule not found" });
    return res.json({ rule });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }
    const rule = await AlertRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ error: "Rule not found" });
    return res.json({ message: "Rule deleted", rule });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;