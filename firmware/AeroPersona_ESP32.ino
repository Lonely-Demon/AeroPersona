/* ============================================================================
 * AeroPersona – Personalized Multi-User Smart Fan
 * ESP32 Hardware Firmware for atomQUEST 2026 Round 2 (Team ALPZET MATRIX)
 *
 * Hardware Components:
 * - ESP32 DevKit V1 (Main microcontroller)
 * - DHT11 (Temperature & Relative Humidity on GPIO 4)
 * - HC-SR501 (PIR Motion/Occupancy sensor on GPIO 13)
 * - L298N Dual H-Bridge Motor Driver (PWM ENA on GPIO 18, IN1 on GPIO 19, IN2 on GPIO 21)
 * - 1-Channel 5V Relay Module (Connected-device aux control on GPIO 5)
 * - LM2596 Buck Converter (12V DC to 5V DC step-down for ESP32 & sensors)
 * - 12V Brushed DC Motor (Main fan motor connected to OUT1 & OUT2 of L298N)
 *
 * Compatibility:
 * - ESP32 Arduino Core 2.x and 3.x compatible (auto-detected PWM APIs)
 * - ArduinoJson 6.x and 7.x compatible
 * ============================================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ---- Wi-Fi Configuration ----
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ---- Pin Assignments ----
#define DHT_PIN          4     // DHT11 Data Pin
#define DHT_TYPE         DHT11
#define PIR_PIN          13    // HC-SR501 PIR Motion Sensor Output
#define RELAY_PIN        5     // Single-channel Relay for Aux Device (Active LOW)
#define MOTOR_ENA_PIN    18    // L298N ENA (PWM Speed Control)
#define MOTOR_IN1_PIN    19    // L298N IN1 Direction
#define MOTOR_IN2_PIN    21    // L298N IN2 Direction

// ---- PWM Configuration ----
#define PWM_FREQ         5000  // 5 kHz PWM frequency for smooth motor rotation
#define PWM_RESOLUTION   8     // 8-bit resolution (0 to 255)

// Handle Core 2.x vs Core 3.x PWM API differences
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  #define PWM_CORE_V3 1
#elif defined(ESP_IDF_VERSION_MAJOR) && ESP_IDF_VERSION_MAJOR >= 5
  #define PWM_CORE_V3 1
#else
  #define PWM_CORE_V3 0
#endif

#if !PWM_CORE_V3
  #define PWM_CHANNEL 0
#endif

// ---- Objects & Server ----
DHT dht(DHT_PIN, DHT_TYPE);
WebServer server(80);

// ---- Global System State ----
bool fanOn = false;
int requestedSpeedPercent = 0; // 0-100%
String currentFanMode = "manual";

float lastTemperatureC = 0.0;
float lastHumidityPct = 0.0;
bool sensorOnline = false;
bool pirOccupied = false;
bool relayOn = false;

// Automation Settings stored in ESP32 memory
bool autoEnabled = false;
float tempThresholdC = 30.0;
int humidityThresholdPct = 70;

unsigned long lastSensorReadTime = 0;
const unsigned long SENSOR_INTERVAL = 2000; // DHT11 minimum 2-sec read interval
unsigned long lastWifiCheck = 0;

// ---- Helper: Set Motor Speed ----
void applyMotorPWM(int speedPct) {
  if (!fanOn || speedPct <= 0) {
#if PWM_CORE_V3
    ledcWrite(MOTOR_ENA_PIN, 0);
#else
    ledcWrite(PWM_CHANNEL, 0);
#endif
    digitalWrite(MOTOR_IN1_PIN, LOW);
    digitalWrite(MOTOR_IN2_PIN, LOW);
  } else {
    // Forward direction
    digitalWrite(MOTOR_IN1_PIN, HIGH);
    digitalWrite(MOTOR_IN2_PIN, LOW);
    // Convert 0-100% to 0-255 PWM duty cycle
    int dutyCycle = map(constrain(speedPct, 0, 100), 0, 100, 0, 255);
#if PWM_CORE_V3
    ledcWrite(MOTOR_ENA_PIN, dutyCycle);
#else
    ledcWrite(PWM_CHANNEL, dutyCycle);
#endif
  }
}

// ---- Helper: Send CORS Headers ----
void setCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ---- REST API Handlers ----

// OPTIONS handler for pre-flight CORS
void handleOptions() {
  setCorsHeaders();
  server.send(204);
}

// GET /api/status
void handleGetStatus() {
  setCorsHeaders();
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<512> doc;
#endif

  doc["fan"]["on"] = fanOn;
  doc["fan"]["speedPercent"] = requestedSpeedPercent;
  doc["fan"]["mode"] = currentFanMode;

  doc["sensor"]["temperatureC"] = lastTemperatureC;
  doc["sensor"]["humidityPct"] = lastHumidityPct;
  doc["sensor"]["sensorOnline"] = sensorOnline;

  doc["occupancy"]["pirDetected"] = pirOccupied;
  // Initialize usersPresent array
  JsonArray usersArr = doc["occupancy"]["usersPresent"].to<JsonArray>();

  doc["relay"]["on"] = relayOn;

  String jsonStr;
  serializeJson(doc, jsonStr);
  server.send(200, "application/json", jsonStr);
}

// POST /api/fan/power -> {"on": true}
void handlePostFanPower() {
  setCorsHeaders();
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Missing body\"}");
    return;
  }
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<128> doc;
#endif
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  fanOn = doc["on"] | false;
  if (fanOn && requestedSpeedPercent == 0) {
    requestedSpeedPercent = 50; // Fallback default if turning on with 0%
  }
  applyMotorPWM(fanOn ? requestedSpeedPercent : 0);

  server.send(200, "application/json", "{\"status\":\"ok\",\"fanOn\":" + String(fanOn ? "true" : "false") + ",\"speedPercent\":" + String(requestedSpeedPercent) + "}");
}

// POST /api/fan/speed -> {"speedPercent": 65}
void handlePostFanSpeed() {
  setCorsHeaders();
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Missing body\"}");
    return;
  }
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<128> doc;
#endif
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  int speed = doc["speedPercent"] | 0;
  requestedSpeedPercent = constrain(speed, 0, 100);
  fanOn = requestedSpeedPercent > 0;
  applyMotorPWM(requestedSpeedPercent);

  server.send(200, "application/json", "{\"status\":\"ok\",\"speedPercent\":" + String(requestedSpeedPercent) + ",\"fanOn\":" + String(fanOn ? "true" : "false") + "}");
}

// POST /api/fan/mode -> {"mode": "personalized"}
void handlePostFanMode() {
  setCorsHeaders();
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Missing body\"}");
    return;
  }
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<128> doc;
#endif
  deserializeJson(doc, server.arg("plain"));
  currentFanMode = doc["mode"] | "manual";

  server.send(200, "application/json", "{\"status\":\"ok\",\"mode\":\"" + currentFanMode + "\"}");
}

// POST /api/automation/settings -> {"temperatureThresholdC": 30.0, "humidityThresholdPct": 70, "enabled": true}
void handlePostAutomationSettings() {
  setCorsHeaders();
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Missing body\"}");
    return;
  }
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<256> doc;
#endif
  deserializeJson(doc, server.arg("plain"));

  tempThresholdC = doc["temperatureThresholdC"] | tempThresholdC;
  humidityThresholdPct = doc["humidityThresholdPct"] | humidityThresholdPct;
  autoEnabled = doc["enabled"] | autoEnabled;

  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// POST /api/relay -> {"on": true}
void handlePostRelay() {
  setCorsHeaders();
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Missing body\"}");
    return;
  }
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<128> doc;
#endif
  deserializeJson(doc, server.arg("plain"));

  relayOn = doc["on"] | false;
  // Relay modules are typically active LOW: LOW = energized/ON, HIGH = de-energized/OFF
  digitalWrite(RELAY_PIN, relayOn ? LOW : HIGH);

  server.send(200, "application/json", "{\"status\":\"ok\",\"relayOn\":" + String(relayOn ? "true" : "false") + "}");
}

// ---- Setup & Loop ----
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("  AeroPersona Smart Fan Controller v1.2   ");
  Serial.println("  Team ALPZET MATRIX - atomQUEST 2026    ");
  Serial.println("==========================================");

  // Initialize GPIO Pins
  pinMode(PIR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Default Relay OFF (Active LOW)

  pinMode(MOTOR_IN1_PIN, OUTPUT);
  pinMode(MOTOR_IN2_PIN, OUTPUT);
  digitalWrite(MOTOR_IN1_PIN, LOW);
  digitalWrite(MOTOR_IN2_PIN, LOW);

  // Configure PWM for L298N with Core 2.x / 3.x compatibility
#if PWM_CORE_V3
  Serial.println("[PWM] Using ESP32 Arduino Core 3.x ledcAttach API");
  ledcAttach(MOTOR_ENA_PIN, PWM_FREQ, PWM_RESOLUTION);
  ledcWrite(MOTOR_ENA_PIN, 0);
#else
  Serial.println("[PWM] Using ESP32 Arduino Core 2.x ledcSetup/AttachPin API");
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(MOTOR_ENA_PIN, PWM_CHANNEL);
  ledcWrite(PWM_CHANNEL, 0);
#endif

  // Initialize DHT11
  dht.begin();

  // Connect Wi-Fi
  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 25) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.print("[Wi-Fi] Assigned IP Address: http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi] Warning: Connection timeout. Will retry in background loop.");
  }

  // Register Web Endpoints
  server.on("/api/status", HTTP_GET, handleGetStatus);
  server.on("/api/fan/power", HTTP_POST, handlePostFanPower);
  server.on("/api/fan/speed", HTTP_POST, handlePostFanSpeed);
  server.on("/api/fan/mode", HTTP_POST, handlePostFanMode);
  server.on("/api/automation/settings", HTTP_POST, handlePostAutomationSettings);
  server.on("/api/relay", HTTP_POST, handlePostRelay);

  // Handle OPTIONS for CORS
  server.on("/api/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/fan/power", HTTP_OPTIONS, handleOptions);
  server.on("/api/fan/speed", HTTP_OPTIONS, handleOptions);
  server.on("/api/fan/mode", HTTP_OPTIONS, handleOptions);
  server.on("/api/automation/settings", HTTP_OPTIONS, handleOptions);
  server.on("/api/relay", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("[HTTP] REST Server Started on Port 80");
}

void loop() {
  server.handleClient();

  unsigned long now = millis();

  // Non-blocking Wi-Fi reconnect watchdog (every 10s if disconnected)
  if (now - lastWifiCheck >= 10000) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[Wi-Fi] Connection lost. Attempting reconnect...");
      WiFi.reconnect();
    }
  }

  // Periodic Sensor Telemetry Reading (every 2s)
  if (now - lastSensorReadTime >= SENSOR_INTERVAL) {
    lastSensorReadTime = now;

    // Read DHT11
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h) && t > 0 && h > 0) {
      lastTemperatureC = t;
      lastHumidityPct = h;
      sensorOnline = true;
    } else {
      sensorOnline = false;
    }

    // Read HC-SR501 PIR sensor
    pirOccupied = (digitalRead(PIR_PIN) == HIGH);
  }
}
