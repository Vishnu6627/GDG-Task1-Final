const express = require("express");
const mongoose = require("mongoose");
const Alert = require("../models/Alert");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const allowedStatuses = ["open", "acknowledged", "resolved"];
    const filter = {};
    if (req.query.status !== undefined) {
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          error: "status must be open, acknowledged, or resolved"
        });
      }
      filter.status = req.query.status;
    }
    const alerts = await Alert.find(filter).sort({ triggeredAt: -1 }).limit(500).lean();
    return res.json({ count: alerts.length, alerts });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/acknowledge", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid alert ID" });
    }
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    if (alert.status === "resolved") {
      return res.status(400).json({ error: "Resolved alerts cannot be acknowledged" });
    }
    alert.status = "acknowledged";
    await alert.save();
    return res.json({ alert });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/resolve", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid alert ID" });
    }
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: "resolved" },
      { new: true, runValidators: true }
    );
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    return res.json({ alert });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;