const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: "AlertRule", required: true },
  sensorId: { type: String, required: true, index: true },
  type: { type: String, required: true, lowercase: true },
  value: { type: Number, required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ["open", "acknowledged", "resolved"],
    default: "open",
    index: true
  },
  triggeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

alertSchema.index({ ruleId: 1, sensorId: 1, status: 1 });

module.exports = mongoose.model("Alert", alertSchema);