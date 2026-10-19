CAMPUSPULSE - QUICK START

1. Copy/extract all project files into your existing folder:
   C:\Users\VISHNU R\Desktop\gdg
   Choose Replace files if asked. KEEP your existing .env file.

2. Make sure MongoDB is running.

3. In PowerShell:
   cd "C:\Users\VISHNU R\Desktop\gdg"
   npm.cmd install

4. If port 3000 is already in use, stop the old server terminal with Ctrl+C.
   Then run:
   npm.cmd run dev

5. Open this in your browser:
   http://localhost:3000

The dashboard refreshes every 10 seconds and shows readings, active sensors,
open alerts and enabled rules. You can create alert rules and resolve alerts
from the dashboard.

LOAD TEST (optional; only while server is running, in a second PowerShell):
   cd "C:\Users\VISHNU R\Desktop\gdg"
   node simulator/loadTest.js 10000

API endpoints:
GET  /health
GET  /api/stats
GET  /api/readings
POST /api/readings
POST /api/readings/batch
GET  /api/rules
POST /api/rules
GET  /api/alerts
PATCH /api/alerts/:id/resolve

Example reading JSON:
{
  "sensorId": "sensor-01",
  "type": "temperature",
  "value": 25,
  "timestamp": "2026-10-19T10:00:00.000Z"
}
