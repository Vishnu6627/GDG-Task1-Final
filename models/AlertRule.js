const mongoose = require("mongoose");

const alertRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true, lowercase: true },
  sensorId: { type: String, default: null, trim: true },
  condition: {
    type: String,
    required: true,
    enum: ["gt", "gte", "lt", "lte", "eq"]
  },
  threshold: { type: Number, required: true },
  windowMinutes: { type: Number, default: 0, min: 0 },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("AlertRule", alertRuleSchema);