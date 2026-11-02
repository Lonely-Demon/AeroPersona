// ============================================================================
// AeroPersona – Wokwi Live Bi-Directional Bridge Server
// Connects the AeroPersona Web Application directly to a Wokwi online simulation!
//
// Web App (Browser) <---> HTTP REST (Port 8080) <---> Wokwi ESP32 Simulation
// Run with: node scripts/wokwi-bridge.js [port]
// ============================================================================

import http from 'http';

const PORT = parseInt(process.argv[2], 10) || 8080;

// Shared Hardware State between Web App and Wokwi Simulation
let state = {
  fan: {
    on: false,
    speedPercent: 0,
    mode: 'manual',
  },
  sensor: {
    temperatureC: 28.5,
    humidityPct: 55.0,
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

// Queue of pending commands to be applied by the Wokwi ESP32
let pendingCommands = {};

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

  if (method === 'OPTIONS') {
    handleCors(res);
    return;
  }

  // 1. Web App Endpoint: GET /api/status
  if (method === 'GET' && url === '/api/status') {
    sendJson(res, 200, state);
    return;
  }

  if (method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      let parsed = {};
      try {
        if (body) parsed = JSON.parse(body);
      } catch (e) {
        sendJson(res, 400, { error: 'Bad JSON' });
        return;
      }

      // 2. Wokwi Sync Endpoint: POST /wokwi/sync
      // Wokwi ESP32 sends current sensors (DHT22, PIR) and receives pending commands
      if (url === '/wokwi/sync') {
        if (parsed.temperatureC !== undefined) {
          state.sensor.temperatureC = parsed.temperatureC;
          state.sensor.humidityPct = parsed.humidityPct;
          state.sensor.sensorOnline = true;
        }
        if (parsed.pirDetected !== undefined) {
          state.occupancy.pirDetected = parsed.pirDetected;
        }

        // Reply with pending commands and clear queue
        const commandsToSend = { ...pendingCommands };
        pendingCommands = {};
        sendJson(res, 200, commandsToSend);
        return;
      }

      // 3. Web App Endpoint: POST /api/fan/power
      if (url === '/api/fan/power') {
        state.fan.on = Boolean(parsed.on);
        if (state.fan.on && state.fan.speedPercent === 0) {
          state.fan.speedPercent = 50;
        }
        pendingCommands.fanOn = state.fan.on;
        pendingCommands.speedPercent = state.fan.speedPercent;
        console.log(`[Bridge -> Wokwi] Fan Power: ${state.fan.on ? 'ON' : 'OFF'} (${state.fan.speedPercent}%)`);
        sendJson(res, 200, { status: 'ok', fanOn: state.fan.on, speedPercent: state.fan.speedPercent });
        return;
      }

      // 4. Web App Endpoint: POST /api/fan/speed
      if (url === '/api/fan/speed') {
        const speed = Math.max(0, Math.min(100, Math.round(parsed.speedPercent || 0)));
        state.fan.speedPercent = speed;
        state.fan.on = speed > 0;
        pendingCommands.speedPercent = speed;
        pendingCommands.fanOn = state.fan.on;
        console.log(`[Bridge -> Wokwi] Fan PWM Speed: ${speed}%`);
        sendJson(res, 200, { status: 'ok', speedPercent: speed, fanOn: state.fan.on });
        return;
      }

      // 5. Web App Endpoint: POST /api/relay
      if (url === '/api/relay') {
        state.relay.on = Boolean(parsed.on);
        pendingCommands.relayOn = state.relay.on;
        console.log(`[Bridge -> Wokwi] Aux Relay: ${state.relay.on ? 'ON' : 'OFF'}`);
        sendJson(res, 200, { status: 'ok', relayOn: state.relay.on });
        return;
      }

      // 6. Web App Endpoint: POST /api/fan/mode
      if (url === '/api/fan/mode') {
        state.fan.mode = parsed.mode || 'manual';
        sendJson(res, 200, { status: 'ok', mode: state.fan.mode });
        return;
      }

      // 7. Web App Endpoint: POST /api/automation/settings
      if (url === '/api/automation/settings') {
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      sendJson(res, 404, { error: 'Endpoint not found' });
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log('\n================================================================');
  console.log(`🌉 AeroPersona Wokwi Bridge running at http://localhost:${PORT}`);
  console.log('================================================================');
  console.log('Connects:');
  console.log('  1. AeroPersona Web App -> Settings -> Hardware Mode -> http://localhost:' + PORT);
  console.log('  2. Wokwi Simulation    -> Syncs sensor & motor states in real time');
  console.log('================================================================\n');
});
