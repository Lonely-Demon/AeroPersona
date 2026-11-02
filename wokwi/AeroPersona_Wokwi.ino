/* ============================================================================
 * AeroPersona – Wokwi Virtual Hardware Simulator Firmware
 * Team ALPZET MATRIX – atomQUEST 2026 Round 2
 *
 * Interactive Controls in Wokwi Simulation:
 * - Click the DHT22 sensor to adjust simulated Temperature and Humidity
 * - Click the PIR sensor to trigger Motion / Occupancy
 * - Watch the Blue LED brightness modulate with Fan PWM speed (0–100%)
 * - Watch the Relay module click and Green Aux LED light up on threshold trigger
 * ============================================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ---- Wokwi Virtual Wi-Fi ----
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// Optional: If using the zero-config wokwi-bridge on your computer,
// set this to your local computer's LAN IP (e.g. "http://192.168.1.15:8080")
// or use "http://host.wokwi.internal:8080" when using Wokwi Bridge.
String bridgeUrl = "http://host.wokwi.internal:8080";

// ---- Pin Assignments matching AeroPersona Prototype ----
#define DHT_PIN          4     // DHT22 Data Pin
#define DHT_TYPE         DHT22 // Wokwi supports interactive DHT22 slider
#define PIR_PIN          13    // PIR Motion Sensor
#define RELAY_PIN        5     // Relay Module (Active LOW)
#define MOTOR_ENA_PIN    18    // Fan PWM Pin (Connected to Blue LED via 220R)

#define PWM_FREQ         5000  // 5 kHz PWM
#define PWM_RESOLUTION   8     // 8-bit (0-255)

DHT dht(DHT_PIN, DHT_TYPE);
WebServer server(80);

// System State
bool fanOn = false;
int requestedSpeedPercent = 0;
String currentFanMode = "manual";
float lastTemperatureC = 28.5;
float lastHumidityPct = 55.0;
bool sensorOnline = true;
bool pirOccupied = false;
bool relayOn = false;

unsigned long lastSensorRead = 0;
unsigned long lastBridgeSync = 0;

void applyPWM(int speedPct) {
  if (!fanOn || speedPct <= 0) {
    ledcWrite(MOTOR_ENA_PIN, 0);
  } else {
    int duty = map(constrain(speedPct, 0, 100), 0, 100, 0, 255);
    ledcWrite(MOTOR_ENA_PIN, duty);
  }
}

void setCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleOptions() {
  setCors();
  server.send(204);
}

void handleGetStatus() {
  setCors();
  JsonDocument doc;
  doc["fan"]["on"] = fanOn;
  doc["fan"]["speedPercent"] = requestedSpeedPercent;
  doc["fan"]["mode"] = currentFanMode;
  doc["sensor"]["temperatureC"] = lastTemperatureC;
  doc["sensor"]["humidityPct"] = lastHumidityPct;
  doc["sensor"]["sensorOnline"] = sensorOnline;
  doc["occupancy"]["pirDetected"] = pirOccupied;
  doc["occupancy"]["usersPresent"].to<JsonArray>();
  doc["relay"]["on"] = relayOn;

  String res;
  serializeJson(doc, res);
  server.send(200, "application/json", res);
}

void handlePostPower() {
  setCors();
  if (server.hasArg("plain")) {
    JsonDocument doc;
    deserializeJson(doc, server.arg("plain"));
    fanOn = doc["on"] | false;
    if (fanOn && requestedSpeedPercent == 0) requestedSpeedPercent = 50;
    applyPWM(fanOn ? requestedSpeedPercent : 0);
  }
  server.send(200, "application/json", "{\"status\":\"ok\",\"fanOn\":" + String(fanOn ? "true" : "false") + "}");
}

void handlePostSpeed() {
  setCors();
  if (server.hasArg("plain")) {
    JsonDocument doc;
    deserializeJson(doc, server.arg("plain"));
    requestedSpeedPercent = constrain((int)(doc["speedPercent"] | 0), 0, 100);
    fanOn = requestedSpeedPercent > 0;
    applyPWM(requestedSpeedPercent);
  }
  server.send(200, "application/json", "{\"status\":\"ok\",\"speedPercent\":" + String(requestedSpeedPercent) + "}");
}

void handlePostRelay() {
  setCors();
  if (server.hasArg("plain")) {
    JsonDocument doc;
    deserializeJson(doc, server.arg("plain"));
    relayOn = doc["on"] | false;
    digitalWrite(RELAY_PIN, relayOn ? LOW : HIGH);
  }
  server.send(200, "application/json", "{\"status\":\"ok\",\"relayOn\":" + String(relayOn ? "true" : "false") + "}");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n--- AeroPersona Wokwi Virtual Hardware Simulator ---");

  pinMode(PIR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Off (active low)

  // Configure PWM for Core 3.x
  ledcAttach(MOTOR_ENA_PIN, PWM_FREQ, PWM_RESOLUTION);
  ledcWrite(MOTOR_ENA_PIN, 0);

  dht.begin();

  // Connect Wokwi WiFi
  Serial.print("Connecting to Wokwi-GUEST");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\n[Wi-Fi] Connected to Wokwi-GUEST!");
  Serial.print("[Wi-Fi] Wokwi IP: ");
  Serial.println(WiFi.localIP());

  // Direct REST server endpoints (active when using Wokwi IoT Gateway)
  server.on("/api/status", HTTP_GET, handleGetStatus);
  server.on("/api/fan/power", HTTP_POST, handlePostPower);
  server.on("/api/fan/speed", HTTP_POST, handlePostSpeed);
  server.on("/api/relay", HTTP_POST, handlePostRelay);
  server.on("/api/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/fan/power", HTTP_OPTIONS, handleOptions);
  server.on("/api/fan/speed", HTTP_OPTIONS, handleOptions);
  server.on("/api/relay", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("[HTTP] WebServer listening on Port 80");
}

void loop() {
  server.handleClient();

  unsigned long now = millis();

  // Read sensors every 1.5 seconds
  if (now - lastSensorRead >= 1500) {
    lastSensorRead = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      lastTemperatureC = t;
      lastHumidityPct = h;
      sensorOnline = true;
    }
    pirOccupied = (digitalRead(PIR_PIN) == HIGH);
  }

  // Optional: Outbound sync to local bridge (runs every 1 sec)
  if (now - lastBridgeSync >= 1000) {
    lastBridgeSync = now;
    if (WiFi.status() == WL_CONNECTED) {
      WiFiClient client;
      HTTPClient http;
      if (http.begin(client, bridgeUrl + "/wokwi/sync")) {
        http.addHeader("Content-Type", "application/json");
        JsonDocument txDoc;
        txDoc["temperatureC"] = lastTemperatureC;
        txDoc["humidityPct"] = lastHumidityPct;
        txDoc["pirDetected"] = pirOccupied;
        txDoc["fanSpeed"] = requestedSpeedPercent;
        txDoc["fanOn"] = fanOn;
        txDoc["relayOn"] = relayOn;

        String txPayload;
        serializeJson(txDoc, txPayload);

        int httpCode = http.POST(txPayload);
        if (httpCode == 200) {
          String rxPayload = http.getString();
          JsonDocument rxDoc;
          if (!deserializeJson(rxDoc, rxPayload)) {
            // Apply commands received from the AeroPersona web app
            if (rxDoc.containsKey("speedPercent")) {
              int newSpeed = rxDoc["speedPercent"];
              if (newSpeed != requestedSpeedPercent) {
                requestedSpeedPercent = newSpeed;
                fanOn = requestedSpeedPercent > 0;
                applyPWM(requestedSpeedPercent);
                Serial.printf("[Wokwi] Speed updated to %d%%\n", requestedSpeedPercent);
              }
            }
            if (rxDoc.containsKey("fanOn")) {
              bool newPower = rxDoc["fanOn"];
              if (newPower != fanOn) {
                fanOn = newPower;
                applyPWM(fanOn ? requestedSpeedPercent : 0);
                Serial.printf("[Wokwi] Power changed to %s\n", fanOn ? "ON" : "OFF");
              }
            }
            if (rxDoc.containsKey("relayOn")) {
              bool newRelay = rxDoc["relayOn"];
              if (newRelay != relayOn) {
                relayOn = newRelay;
                digitalWrite(RELAY_PIN, relayOn ? LOW : HIGH);
                Serial.printf("[Wokwi] Relay changed to %s\n", relayOn ? "ON" : "OFF");
              }
            }
          }
        }
        http.end();
      }
    }
  }
}
