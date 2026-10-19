const Reading = require("../models/Reading");
const AlertRule = require("../models/AlertRule");
const Alert = require("../models/Alert");

function matchesCondition(value, condition, threshold) {
  switch (condition) {
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
    case "eq": return value === threshold;
    default: return false;
  }
}

async function evaluateReading(reading) {
  const rules = await AlertRule.find({
    type: reading.type,
    enabled: true,
    $or: [{ sensorId: null }, { sensorId: "" }, { sensorId: reading.sensorId }]
  }).lean();

  const createdAlerts = [];

  for (const rule of rules) {
    let evaluatedValue = reading.value;

    if (rule.windowMinutes > 0) {
      const since = new Date(reading.timestamp.getTime() - rule.windowMinutes * 60 * 1000);
      const result = await Reading.aggregate([
        {
          $match: {
            sensorId: reading.sensorId,
            type: reading.type,
            timestamp: { $gte: since, $lte: reading.timestamp }
          }
        },
        { $group: { _id: null, average: { $avg: "$value" } } }
      ]);
      if (!result.length || typeof result[0].average !== "number") continue;
      evaluatedValue = result[0].average;
    }

    if (!matchesCondition(evaluatedValue, rule.condition, rule.threshold)) continue;

    const activeAlert = await Alert.findOne({
      ruleId: rule._id,
      sensorId: reading.sensorId,
      status: { $in: ["open", "acknowledged"] }
    });

    if (activeAlert) continue;

    const alert = await Alert.create({
      ruleId: rule._id,
      sensorId: reading.sensorId,
      type: reading.type,
      value: evaluatedValue,
      message: `${rule.name}: ${reading.type} value ${evaluatedValue} ${rule.condition} ${rule.threshold}`,
      triggeredAt: reading.timestamp
    });

    createdAlerts.push(alert);
  }

  return createdAlerts;
}

module.exports = { evaluateReading, matchesCondition };