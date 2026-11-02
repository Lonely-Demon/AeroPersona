# AeroPersona – Wokwi Virtual Hardware Simulator
**atomQUEST 2026 Round 2 – Team ALPZET MATRIX**

This directory contains the complete virtual hardware setup for simulating the AeroPersona ESP32 prototype on **[Wokwi](https://wokwi.com)** and connecting it directly to the AeroPersona Web Application!

---

## 🖥️ Simulated Virtual Hardware Components

In this Wokwi simulation, you have:
1. **ESP32 DevKit V1**: Microcontroller running Arduino code.
2. **DHT22 Sensor** (`GPIO 4`): Click on it in Wokwi to change temperature and humidity interactively!
3. **PIR Motion Sensor** (`GPIO 13`): Click on it in Wokwi to simulate human motion/occupancy!
4. **Relay Module** (`GPIO 5`): Clicks and activates the connected green Aux indicator LED.
5. **Fan Motor PWM Indicator** (`GPIO 18`): Blue LED whose brightness smoothly modulates with PWM speed (0–100%).

---

## 🚀 How to Run & Connect End-to-End

### Step 1: Open the Simulation in Wokwi

#### Option A: In Your Browser (Zero Install)
1. Go to **[https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32)**.
2. Click on the `diagram.json` tab and paste the contents of [`wokwi/diagram.json`](./diagram.json).
3. Click on the `sketch.ino` tab and paste the contents of [`wokwi/AeroPersona_Wokwi.ino`](./AeroPersona_Wokwi.ino).
4. Click the **Play** (Green Start) button to run the simulation!

#### Option B: In Visual Studio Code
1. Install the official **"Wokwi Simulator"** extension from the VS Code Marketplace.
2. Open this folder in VS Code.
3. Open `wokwi/diagram.json` and press **F1** $\rightarrow$ **Wokwi: Start Simulator**.

---

### Step 2: Connect the AeroPersona Web App to Wokwi

Because Wokwi runs in a browser sandbox, the included **Wokwi Bridge** connects the web application to the simulation:

1. **Start the Wokwi Bridge**:
   ```bash
   npm run wokwi-bridge
   ```
   *(Runs a local bridge on port 8080)*

2. **Start the Web App**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`.

3. **Link the Web App to the Bridge**:
   - In the AeroPersona app, go to **Settings**.
   - Toggle **Physical Hardware Mode** to **ON**.
   - Set IP to: `http://localhost:8080`.
   - Tap **Test Connection** $\rightarrow$ Status turns **Connected**!

---

### 🎮 End-to-End Test Scenarios

Now you can interact with BOTH the physical simulation and the web app simultaneously:

1. **Fan Speed Control Test**:
   - In the AeroPersona app, open **Fan Control** and set speed to **80%**.
   - Look at Wokwi: The Blue LED brightens intensely to represent 80% PWM motor duty cycle!
   - Turn speed to **20%**: The Blue LED dims smoothly.

2. **Interactive Temperature Automation Test**:
   - In Wokwi, click the **DHT22** sensor and drag the temperature slider to **35°C**.
   - Look at the web app **Dashboard**: The ambient temperature tile immediately updates to **35°C**!
   - Look at the **Smart Automation** page: The condition turns red, the relay triggers, and in Wokwi, the Relay module clicks and the Green Aux LED lights up!

3. **Occupancy & Auto-Off Countdown Test**:
   - In Wokwi, click the **PIR** sensor to trigger motion.
   - Look at the web app: Room occupancy turns to **Occupied**.
   - Stop motion: After motion clears, watch the web app start the empty-room countdown and turn off the fan after the timeout!
