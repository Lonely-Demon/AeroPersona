# AeroPersona – Hardware Setup & Integration Guide
**atomQUEST 2026 Round 2 – Team ALPZET MATRIX**

This document describes the complete wiring, pin assignments, power distribution, and software communication setup for the AeroPersona physical prototype.

---

## 1. Hardware Bill of Materials (BOM)

| Component | Function | Operating Voltage |
|---|---|---|
| **ESP32 DevKit V1** | Main System Controller & REST Server | 5V DC (via VIN) / 3.3V Logic |
| **DHT11** | Ambient Temperature & Relative Humidity | 3.3V – 5V DC |
| **HC-SR501 PIR** | Passive Infrared Occupancy & Motion Sensing | 5V DC power, 3.3V Logic out |
| **L298N Motor Driver** | Dual H-Bridge for DC Motor PWM Speed Control | 12V Motor, 5V Logic |
| **12V Brushed DC Motor**| Main Fan Rotation Mechanism | 12V DC |
| **Single-Channel Relay**| Aux Connected-Device Switch (Demonstration mini fan/LED) | 5V DC, Active LOW |
| **LM2596 Buck Converter**| Steps down 12V DC input to regulated 5V DC for ESP32 & sensors | 12V In, 5V Out |
| **12V DC 2A Power Adapter**| Main Prototype Power Supply | 12V DC, 2000mA |

---

## 2. Pinout & Wiring Connections

### 2.1 LM2596 Buck Converter (Power Bus)
- **IN+**: +12V from DC Adapter
- **IN-**: GND from DC Adapter
- **OUT+**: Regulated +5V DC (powers ESP32 VIN, PIR, Relay, DHT11)
- **OUT-**: Common System Ground (tie to L298N GND and ESP32 GND)

### 2.2 ESP32 DevKit V1 Pin Assignments

| ESP32 Pin | Connected Component | Signal Type | Description |
|---|---|---|---|
| **VIN** | LM2596 OUT+ | Power (+5V) | Regulated power input |
| **GND** | System Ground Bus | Ground (0V) | Common ground reference |
| **GPIO 4** | DHT11 Data Pin | Digital I/O | Temperature & Humidity read |
| **GPIO 13** | HC-SR501 OUT Pin | Digital Input | High = Motion / Occupancy detected |
| **GPIO 5** | Relay Module IN Pin | Digital Output | Low = Relay energized (Aux device ON) |
| **GPIO 18** | L298N ENA | PWM Output | 5 kHz PWM speed control (0–255) |
| **GPIO 19** | L298N IN1 | Digital Output | Motor Direction Forward (HIGH) |
| **GPIO 21** | L298N IN2 | Digital Output | Motor Direction Low (LOW) |

### 2.3 L298N Motor Driver Connections
- **+12V Terminal**: +12V from DC Power Adapter
- **GND Terminal**: Common Ground Bus
- **+5V Terminal**: Connect to LM2596 OUT+ if logic jumper is removed, or leave on-board jumper on
- **ENA**: Connected to ESP32 GPIO 18 (PWM duty cycle controls fan speed)
- **IN1 / IN2**: Connected to GPIO 19 and GPIO 21
- **OUT1 / OUT2**: Connected to the 12V Brushed DC Fan Motor

### 2.4 Single-Channel Relay Connections
- **VCC**: +5V DC
- **GND**: Common Ground
- **IN**: GPIO 5 (Active LOW)
- **COM / NO**: Switches power to the auxiliary demonstration device (mini DC fan or LED)

---

## 3. Physical Calibration & Adjustments

1. **LM2596 Voltage Tuning**: Before connecting the ESP32, use a digital multimeter across OUT+ and OUT- and turn the trimpot until the output reads exactly **5.00V DC**.
2. **HC-SR501 PIR Trimpot Tuning**:
   - Set the delay potentiometer counter-clockwise for short trigger delays (~3–5 seconds).
   - Set the sensitivity potentiometer to approximately mid-range (3–4 meters detection).
   - Place jumper in 'H' position (repeatable trigger mode).

---

## 4. Software Communication & API Endpoints

The AeroPersona application communicates over local Wi-Fi with the ESP32 using HTTP REST endpoints on port 80.

### Supported Endpoints:

#### `GET /api/status`
Returns real-time system telemetry:
```json
{
  "fan": {
    "on": true,
    "speedPercent": 65,
    "mode": "personalized"
  },
  "sensor": {
    "temperatureC": 28.5,
    "humidityPct": 56.0
  },
  "occupancy": {
    "pirDetected": true,
    "usersPresent": []
  },
  "relay": {
    "on": false
  }
}
```

#### `POST /api/fan/power`
Body:
```json
{ "on": true }
```

#### `POST /api/fan/speed`
Body:
```json
{ "speedPercent": 75 }
```

#### `POST /api/fan/mode`
Body:
```json
{ "mode": "personalized" }
```

#### `POST /api/automation/settings`
Body:
```json
{
  "temperatureThresholdC": 30.0,
  "humidityThresholdPct": 70,
  "enabled": true
}
```

#### `POST /api/relay`
Body:
```json
{ "on": true }
```

---

## 5. Testing the Integration

### 5.1 Quick Command-Line Smoke Test (cURL)
Before opening the web application, verify the ESP32 server directly from PowerShell or Terminal:
```bash
# 1. Fetch live telemetry status
curl -X GET http://192.168.1.100/api/status

# 2. Turn on fan power
curl -X POST http://192.168.1.100/api/fan/power -H "Content-Type: application/json" -d '{"on": true}'

# 3. Set speed to 65% PWM
curl -X POST http://192.168.1.100/api/fan/speed -H "Content-Type: application/json" -d '{"speedPercent": 65}'

# 4. Energize auxiliary relay
curl -X POST http://192.168.1.100/api/relay -H "Content-Type: application/json" -d '{"on": true}'
```

### 5.2 Browser Application Verification
1. Connect the ESP32 to your local Wi-Fi network by editing `ssid` and `password` in `AeroPersona_ESP32.ino`.
2. Open Serial Monitor at 115200 baud to note the IP address assigned to the ESP32 (e.g. `192.168.1.100`).
3. Open the AeroPersona Web Application in your browser or mobile phone.
4. Go to **Settings**:
   - Toggle **Physical Hardware Mode** to ON.
   - Enter the ESP32 IP address.
   - Tap **Test Connection**.
5. Once connected, changes to speed, power, relay, and modes will reflect instantaneously on the hardware prototype!
