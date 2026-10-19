const BASE_URL = "http://localhost:3000";
const BATCH_SIZE = 500;

async function runTest(total) {
  const readings = Array.from({ length: total }, (_, index) => ({
    sensorId: `sensor-${index % 20}`,
    type: "temperature",
    value: Number((20 + Math.random() * 20).toFixed(2)),
    timestamp: new Date().toISOString()
  }));

  let succeeded = 0;
  let failed = 0;
  const start = performance.now();

  for (let index = 0; index < readings.length; index += BATCH_SIZE) {
    const batch = readings.slice(index, index + BATCH_SIZE);
    try {
      const response = await fetch(`${BASE_URL}/api/readings/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readings: batch })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      succeeded += result.stored;
      console.log(`Progress: ${succeeded}/${total}`);
    } catch (error) {
      failed += batch.length;
      console.error(`Batch starting at ${index} failed: ${error.message}`);
    }
  }

  const elapsed = (performance.now() - start) / 1000;
  console.log("\n===== BATCH LOAD TEST =====");
  console.log("Submitted:", total);
  console.log("Stored:", succeeded);
  console.log("Failed:", failed);
  console.log("Elapsed:", elapsed.toFixed(2), "seconds");
  console.log("Throughput:", (succeeded / Math.max(elapsed, 0.001)).toFixed(2), "readings/sec");
}

const total = Number(process.argv[2] || 1000);
if (!Number.isInteger(total) || total < 1 || total > 10000) {
  console.error("Use a number between 1 and 10000.");
  process.exit(1);
}

runTest(total).catch(error => {
  console.error("Load test failed:", error);
  process.exitCode = 1;
});