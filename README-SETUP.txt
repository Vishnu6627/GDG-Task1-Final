CAMPUS SENSOR MONITORING AND ALERTS

1. Keep your existing .env file. It should contain:
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/campus_sensor_monitoring

2. Copy these files and folders into your existing gdg project folder, merging folders and replacing files when asked. Do not delete .env.

3. In PowerShell, go to the project folder:
   cd "C:\Users\VISHNU R\Desktop\gdg"

4. Install dependencies:
   npm.cmd install

5. Start MongoDB if it is not already running, then start the server:
   npm.cmd run dev

6. In a SECOND PowerShell terminal, test:
   Invoke-RestMethod http://localhost:3000/health

7. Test batch route:
   $body = @{
       readings = @(
           @{
               sensorId = "test-sensor"
               type = "temperature"
               value = 25
               timestamp = (Get-Date).ToUniversalTime().ToString("o")
           }
       )
   } | ConvertTo-Json -Depth 5

   Invoke-RestMethod -Uri "http://localhost:3000/api/readings/batch" -Method Post -ContentType "application/json" -Body $body

   Expected response includes received=1 and stored=1.

8. Run the 10,000 reading test:
   node simulator/loadTest.js 10000

Routes:
GET    /
GET    /health
POST   /api/readings
POST   /api/readings/batch
GET    /api/readings?limit=50
POST   /api/rules
GET    /api/rules
PATCH  /api/rules/:id
DELETE /api/rules/:id
GET    /api/alerts
PATCH  /api/alerts/:id/acknowledge
PATCH  /api/alerts/:id/resolve
