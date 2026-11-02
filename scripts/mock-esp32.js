// ============================================================================
// AeroPersona – Mock ESP32 Hardware REST Server
// Simulates the physical ESP32 DevKit V1 controller on your local machine
// Allows testing "Hardware Mode" without physical electronics.
// Run with: node scripts/mock-esp32.js [port]
// ============================================================================

import http from 'http';

const PORT = parseInt(process.argv[2], 10) || 8080;

// Simulated Hardware State matching firmware/AeroPersona_ESP32.ino
let hardwareState = {
  fan: {
    on: false,
    speedPercent: 0,
    mode: 'manual',
  },
  sensor: {
    temperatureC: 28.5,
    humidityPct: 56.0,
    sensorOnline: true,
  },
  occupancy: {
    pirDetected: false,
    usersPresent: [],
  },
  relay: {
    on: false,
  },
};

// Automation settings stored on ESP32
let autoSettings = {
  temperatureThresholdC: 30.0,
  humidityThresholdPct: 70,
  enabled: false,
};

// Periodic subtle sensor drift to simulate live DHT11 telemetry
setInterval(() => {
  // Drift temp by +/- 0.2 deg C
  const tempJitter = (Math.random() - 0.5) * 0.4;
  hardwareState.sensor.temperatureC = Math.round((hardwareState.sensor.temperatureC + tempJitter) * 10) / 10;
  // Keep realistic bounds 24 - 34 C
  hardwareState.sensor.temperatureC = Math.max(24.0, Math.min(34.0, hardwareState.sensor.temperatureC));

  // Drift humidity by +/- 1%
  const humJitter = (Math.random() - 0.5) * 1.5;
  hardwareState.sensor.humidityPct = Math.round(hardwareState.sensor.humidityPct + humJitter);
  hardwareState.sensor.humidityPct = Math.max(40, Math.min(80, hardwareState.sensor.humidityPct));
}, 3000);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function handleCors(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end();
}

const server = http.createServer((req, res) => {
  const url = req.url || '';
  const method = req.method || 'GET';

  // Handle CORS Pre-flight
  if (method === 'OPTIONS') {
    handleCors(res);
    return;
  }

  // GET /api/status
  if (method === 'GET' && url === '/api/status') {
    sendJson(res, 200, hardwareState);
    return;
  }

  // Parse JSON Body for POST endpoints
  if (method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      let parsed = {};
      try {
        if (body) parsed = JSON.parse(body);
      } catch (err) {
        sendJson(res, 400, { error: 'Invalid JSON payload' });
        return;
      }

      // POST /api/fan/power -> {"on": true}
      if (url === '/api/fan/power') {
        hardwareState.fan.on = Boolean(parsed.on);
        if (hardwareState.fan.on && hardwareState.fan.speedPercent === 0) {
          hardwareState.fan.speedPercent = 50;
        }
        console.log(`[ESP32] Fan Power -> ${hardwareState.fan.on ? 'ON' : 'OFF'} (${hardwareState.fan.speedPercent}%)`);
        sendJson(res, 200, {
          status: 'ok',
          fanOn: hardwareState.fan.on,
          speedPercent: hardwareState.fan.speedPercent,
        });
        return;
      }

      // POST /api/fan/speed -> {"speedPercent": 65}
      if (url === '/api/fan/speed') {
        const speed = Math.max(0, Math.min(100, Math.round(parsed.speedPercent || 0)));
        hardwareState.fan.speedPercent = speed;
        hardwareState.fan.on = speed > 0;
        console.log(`[ESP32] Fan PWM Speed -> ${speed}% (L298N duty cycle: ${Math.round((speed * 255) / 100)}/255)`);
        sendJson(res, 200, {
          status: 'ok',
          speedPercent: speed,
          fanOn: hardwareState.fan.on,
        });
        return;
      }

      // POST /api/fan/mode -> {"mode": "personalized"}
      if (url === '/api/fan/mode') {
        hardwareState.fan.mode = parsed.mode || 'manual';
        console.log(`[ESP32] Fan Mode -> ${hardwareState.fan.mode}`);
        sendJson(res, 200, { status: 'ok', mode: hardwareState.fan.mode });
        return;
      }

      // POST /api/automation/settings
      if (url === '/api/automation/settings') {
        autoSettings = { ...autoSettings, ...parsed };
        console.log(`[ESP32] Automation Settings -> Temp Limit: ${autoSettings.temperatureThresholdC}°C, Enabled: ${autoSettings.enabled}`);
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      // POST /api/relay -> {"on": true}
      if (url === '/api/relay') {
        hardwareState.relay.on = Boolean(parsed.on);
        console.log(`[ESP32] Aux Relay (GPIO 5) -> ${hardwareState.relay.on ? 'ENERGIZED / ON' : 'DE-ENERGIZED / OFF'}`);
        sendJson(res, 200, { status: 'ok', relayOn: hardwareState.relay.on });
        return;
      }

      // Simulator Helper Endpoints for testing:
      // POST /sim/pir -> {"pirDetected": true}
      if (url === '/sim/pir') {
        hardwareState.occupancy.pirDetected = Boolean(parsed.pirDetected);
        console.log(`[SIMULATOR] Physical PIR Motion -> ${hardwareState.occupancy.pirDetected ? 'MOTION DETECTED' : 'CLEAR'}`);
        sendJson(res, 200, { status: 'ok', pirDetected: hardwareState.occupancy.pirDetected });
        return;
      }

      // POST /sim/temp -> {"temp": 32.5}
      if (url === '/sim/temp') {
        hardwareState.sensor.temperatureC = parseFloat(parsed.temp);
        console.log(`[SIMULATOR] Ambient Temp Set -> ${hardwareState.sensor.temperatureC}°C`);
        sendJson(res, 200, { status: 'ok', temp: hardwareState.sensor.temperatureC });
        return;
      }

      sendJson(res, 404, { error: 'Endpoint not found' });
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log('\n======================================================');
  console.log(`🚀 Mock ESP32 Server running at http://localhost:${PORT}`);
  console.log('   Simulating ESP32 DevKit V1 REST Server on port ' + PORT);
  console.log('======================================================');
  console.log('Available Endpoints matching physical firmware:');
  console.log('  GET  /api/status');
  console.log('  POST /api/fan/power');
  console.log('  POST /api/fan/speed');
  console.log('  POST /api/fan/mode');
  console.log('  POST /api/automation/settings');
  console.log('  POST /api/relay');
  console.log('\nInteractive Simulators (optional via curl):');
  console.log(`  curl -X POST http://localhost:${PORT}/sim/pir -d "{\\"pirDetected\\": true}"`);
  console.log(`  curl -X POST http://localhost:${PORT}/sim/temp -d "{\\"temp\\": 33.0}"`);
  console.log('======================================================\n');
});
