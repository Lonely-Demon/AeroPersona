# AeroPersona – Personalized Multi-User Smart Fan
**atomQUEST 2026 Round 2 Hardware Prototype & Software System**  
**Team: ALPZET MATRIX**

---

## 🌟 Executive Overview

**AeroPersona** is an intelligent, multi-user personalized smart fan and environmental automation system. Unlike conventional smart fans that rely on static presets or single-user profiles, AeroPersona uses an explainable machine learning algorithm that:
1. Learns the distinct thermal and airflow speed preferences of individual household members across varying ambient temperatures and humidity levels.
2. Dynamically reconciles preferences when multiple registered users share a room (applying democratic weighted averaging).
3. Automatically triggers connected auxiliary climate devices (via a 5V relay module) based on configurable environmental thresholds.
4. Intelligently shuts down the fan following an empty-room countdown when occupancy motion ceases.

The software is engineered as a responsive, mobile-first Progressive Web Application (PWA) with dual operating environments:
- **Demo Mode**: Full interactive simulation with temperature/humidity sliders and simulated occupancy to demonstrate algorithms without physical hardware.
- **Hardware Mode**: Direct real-time REST API integration with an ESP32 microcontroller controlling a 12V brushed DC motor via L298N PWM, reading a DHT11 sensor, monitoring an HC-SR501 PIR sensor, and switching an aux device relay.

---

## 🏗️ Hardware Architecture & Integration

- **ESP32 DevKit V1**: Main IoT controller running an asynchronous HTTP REST server on local Wi-Fi.
- **DHT11**: Temperature & relative humidity sensing updated every 2 seconds.
- **HC-SR501 PIR**: Passive infrared motion and occupancy detection.
- **L298N Motor Driver**: PWM speed control (5 kHz, 8-bit duty cycle 0–255) for smooth motor rotation.
- **12V Brushed DC Motor**: Main fan propulsion mechanism.
- **Single-Channel Relay Module**: Connected auxiliary device ON/OFF control (mini DC fan or LED).
- **LM2596 Buck Converter**: Steps down 12V DC adapter power to a clean 5.0V DC bus for ESP32 and sensors.
- **12V DC Adapter**: Main power supply.

Complete schematic and Arduino firmware are located in the [`firmware/`](file:///d:/Southern_Ring_Nebula/AeroPersona/firmware) directory:
- [AeroPersona_ESP32.ino](file:///d:/Southern_Ring_Nebula/AeroPersona/firmware/AeroPersona_ESP32.ino): Production-ready Arduino C++ firmware.
- [HARDWARE_SETUP.md](file:///d:/Southern_Ring_Nebula/AeroPersona/firmware/HARDWARE_SETUP.md): Pinout tables and step-by-step wiring guide.

---

## 🧠 Personalized Multi-User Learning Algorithm

AeroPersona avoids opaque, uninterpretable "black box" models. Instead, it utilizes an explainable **Gaussian Environmental Similarity & Recency Decay Weighted Averaging** algorithm:

$$\text{Weight}_i = \exp\left(-\frac{(T_i - T_{\text{curr}})^2}{2\sigma_T^2}\right) \times \exp\left(-\frac{(H_i - H_{\text{curr}})^2}{2\sigma_H^2}\right) \times 2^{-\frac{\Delta t_i}{t_{1/2}}}$$

$$\text{Estimated Speed} = \frac{\sum \text{Weight}_i \cdot \text{Speed}_i}{\sum \text{Weight}_i}$$

Where:
- $\sigma_T = 3.0^\circ\text{C}$ (temperature sensitivity window)
- $\sigma_H = 10.0\%$ (humidity sensitivity window)
- $t_{1/2} = 7\text{ days}$ (preference half-life recency decay)

### Multi-User Reconciliation Rules:
1. **One User Present**: Applies that person's exact learned preferred speed for current ambient conditions.
   - *Example (at baseline 28°C / 55% RH)*: Aarav Patel $\rightarrow$ **48%**.
2. **Two Users Present**: Computes the democratic arithmetic mean of both users' preferred speeds.
   - *Example (at baseline 28°C / 55% RH)*: Aarav Patel (48%) + Meera Rao (67%) $\rightarrow$ Shared speed: **58%**.
3. **Three or More Users Present**: Calculates the collective mean speed across all detected profiles.
4. **Anonymous Occupancy**: If PIR detects occupancy but no registered user profile is present, the configurable default fan speed (e.g. 50%) is applied.
5. **Vacant Room**: Starts an empty-room countdown (configurable, e.g. 120s) and powers off the fan automatically to eliminate energy waste.
6. **Manual Override**: Allows instantaneous human override at any moment without disrupting background model weights.
7. **Relay Chattering Prevention (Dead-Band)**: Auxiliary relay activates when $\text{Temp} > T_{\text{threshold}}$ or $\text{Humidity} > H_{\text{threshold}}$, and deactivates only when temperature drops below $T_{\text{threshold}} - 1.0^\circ\text{C}$ and humidity drops below $H_{\text{threshold}} - 3.0\%$.

---

## 📱 Application Modules & Pages

1. **Dashboard** (`/`): Real-time hero card with spinning fan animation, requested speed indicator (PWM percentage, no fake RPM), ambient temperature, relative humidity, PIR occupancy status, relay state, active user presence pills, and live activity stream.
2. **Fan Control** (`/fan`): Glowing circular master power switch, circular gauge speed display, $\pm 5\%$ precision increment buttons, direct numerical input, interactive range slider, segmented mode switcher (Manual / Personalized / Automatic), and algorithm decision breakdowns.
3. **User Management** (`/users`): Profile creation modal with emoji avatars, user cards with profile color accents, expandable preference statistics, individual Recharts historical speed curves, and in-room presence toggles.
4. **Smart Automation** (`/automation`): Master automation switch, temperature/humidity threshold sliders, dual condition monitor with live status indicators, relay control switch, automated event log, and interactive demo mode environmental sliders.
5. **Analytics** (`/analytics`): Multi-tab telemetry dashboard with Recharts (Temperature trend line, Humidity area chart, Fan speed timeline, Occupancy bar chart, User preference scatter plot, and Automation log). Prominently includes an energy estimation disclaimer.
6. **Settings** (`/settings`): Demo vs. Physical Hardware mode toggle, ESP32 IP address configuration, live connection tester, polling interval selector, fallback speed and timeout sliders, Dark/Light theme toggle, JSON backup export/import, and project credits.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm installed.

### Installation & Run

1. Navigate to the project root directory:
   ```bash
   cd d:\Southern_Ring_Nebula\AeroPersona
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

4. To access from a mobile phone on the same Wi-Fi network:
   Open the Network URL displayed by Vite (e.g., `http://192.168.1.X:5173`).

### Production Build
```bash
npm run build
npm run preview
```

---

## 🏆 atomQUEST 2026 Evaluation Checklist

- [x] Functional controls with zero static/mock placeholder buttons.
- [x] Working data persistence across reloads (`localStorage` via Zustand).
- [x] Transparent, explainable machine learning algorithm for fan speed.
- [x] Multi-user arbitration logic with explicit decision explanations.
- [x] Real-time environmental monitoring (DHT11 & HC-SR501 PIR).
- [x] Smart-home auxiliary relay automation engine.
- [x] Separate Demo Mode and Physical Hardware Mode with no fake data.
- [x] Clean, mobile-first responsive design supporting Dark & Light themes.
- [x] Production-ready ESP32 Arduino firmware and wiring documentation.
