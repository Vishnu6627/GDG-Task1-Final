const mongoose = require("mongoose");

const readingSchema = new mongoose.Schema({
  sensorId: { type: String, required: true, trim: true, index: true },
  type: { type: String, required: true, trim: true, lowercase: true },
  value: { type: Number, required: true },
  timestamp: { type: Date, required: true }
}, { versionKey: false });

readingSchema.index({ timestamp: -1 });
readingSchema.index({ type: 1, timestamp: -1 });

module.exports = mongoose.model("Reading", readingSchema);