// ============================================================================
// AeroPersona – Main Application Store (Zustand)
// Central state management for the entire smart fan application
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  AppSettings,
  AutomationEvent,
  AutomationSettings,
  ConnectionStatus,
  FanMode,
  FanState,
  HistoryDataPoint,
  OccupancyState,
  PreferenceRecord,
  RelayState,
  SensorData,
  SpeedDecisionExplanation,
  SystemEvent,
  UserProfile,
} from '../types';
import { hardwareService } from '../services/hardwareService';
import {
  calculateMultiUserSpeed,
} from '../services/preferenceLearning';

// ---- Profile Color Palette ----
const PROFILE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
];

// ---- Store Interface ----
interface AppStore {
  // ---- State ----
  settings: AppSettings;
  fan: FanState;
  sensor: SensorData;
  occupancy: OccupancyState;
  relay: RelayState;
  connectionStatus: ConnectionStatus;
  lastSuccessfulComm: number | null;

  users: UserProfile[];
  preferenceRecords: PreferenceRecord[];
  automationSettings: AutomationSettings;
  automationEvents: AutomationEvent[];
  systemEvents: SystemEvent[];
  speedDecision: SpeedDecisionExplanation | null;

  // History buffers (last 100 data points each)
  temperatureHistory: HistoryDataPoint[];
  humidityHistory: HistoryDataPoint[];
  speedHistory: HistoryDataPoint[];
  occupancyHistory: HistoryDataPoint[];

  // UI state
  manualOverride: boolean;
  pollingTimer: ReturnType<typeof setInterval> | null;
  emptyRoomTimer: ReturnType<typeof setInterval> | null;

  // ---- Actions ----
  // Settings
  updateSettings: (partial: Partial<AppSettings>) => void;

  // Fan Control
  setFanPower: (on: boolean) => Promise<void>;
  setFanSpeed: (speed: number) => Promise<void>;
  setFanMode: (mode: FanMode) => void;
  setManualOverride: (override: boolean) => void;

  // Sensor (demo mode)
  setDemoTemperature: (temp: number) => void;
  setDemoHumidity: (humidity: number) => void;

  // Occupancy
  setDemoPirDetected: (detected: boolean) => void;
  toggleUserPresence: (userId: string) => void;

  // Users
  addUser: (name: string, icon: string) => void;
  updateUser: (id: string, name: string, icon: string) => void;
  deleteUser: (id: string) => void;

  // Preferences
  recordPreference: (userId: string, speed: number) => void;
  clearUserPreferences: (userId: string) => void;

  // Automation
  updateAutomationSettings: (settings: Partial<AutomationSettings>) => void;

  // Relay
  setRelay: (on: boolean) => Promise<void>;

  // Polling / Hardware
  startPolling: () => void;
  stopPolling: () => void;

  // Internal
  addSystemEvent: (type: SystemEvent['type'], message: string) => void;
  runAutomationCheck: () => void;
  runPersonalizedControl: () => void;
  pushHistory: () => void;
}

// ---- Default Values ----
const DEFAULT_SETTINGS: AppSettings = {
  appMode: 'demo',
  theme: 'dark',
  esp32IpAddress: '192.168.1.100',
  defaultFanSpeed: 50,
  emptyRoomTimeoutSec: 120,
  pollingIntervalMs: 3000,
  minLearningRecords: 5,
};

const DEFAULT_FAN: FanState = {
  isOn: false,
  speedPercent: 0,
  mode: 'manual',
};

const DEFAULT_SENSOR: SensorData = {
  temperatureC: 28,
  humidityPct: 55,
  lastUpdated: Date.now(),
  sensorOnline: true,
};

// Max history buffer size
const MAX_HISTORY = 200;

function pushToBuffer(buffer: HistoryDataPoint[], value: number): HistoryDataPoint[] {
  const newPoint = { timestamp: Date.now(), value };
  const newBuffer = [...buffer, newPoint];
  return newBuffer.length > MAX_HISTORY ? newBuffer.slice(-MAX_HISTORY) : newBuffer;
}

// Initial synthetic seed profiles and sample preference data for atomQUEST instant demonstration
const SEED_USERS: UserProfile[] = [
  {
    id: 'user-alpzet-1',
    name: 'Aarav Patel',
    icon: '👨‍💻',
    createdAt: Date.now() - 86400000 * 3,
    isPresent: false,
    color: '#3B82F6',
  },
  {
    id: 'user-alpzet-2',
    name: 'Meera Rao',
    icon: '👩‍🔬',
    createdAt: Date.now() - 86400000 * 2,
    isPresent: false,
    color: '#10B981',
  },
];

const SEED_PREFERENCES: PreferenceRecord[] = [
  // Aarav: prefers moderate cooling (40-70%)
  { id: 'p1', userId: 'user-alpzet-1', speedPercent: 40, temperatureC: 26.0, humidityPct: 50, occupantCount: 1, timestamp: Date.now() - 86400000 * 2 },
  { id: 'p2', userId: 'user-alpzet-1', speedPercent: 45, temperatureC: 28.0, humidityPct: 55, occupantCount: 1, timestamp: Date.now() - 86400000 * 1 },
  { id: 'p3', userId: 'user-alpzet-1', speedPercent: 70, temperatureC: 32.0, humidityPct: 62, occupantCount: 1, timestamp: Date.now() - 3600000 * 6 },
  { id: 'p4', userId: 'user-alpzet-1', speedPercent: 50, temperatureC: 29.0, humidityPct: 56, occupantCount: 1, timestamp: Date.now() - 3600000 * 3 },
  { id: 'p5', userId: 'user-alpzet-1', speedPercent: 45, temperatureC: 27.5, humidityPct: 53, occupantCount: 1, timestamp: Date.now() - 3600000 * 1 },
  // Meera: prefers stronger cooling (60-85%)
  { id: 'p6', userId: 'user-alpzet-2', speedPercent: 60, temperatureC: 26.0, humidityPct: 50, occupantCount: 1, timestamp: Date.now() - 86400000 * 2 },
  { id: 'p7', userId: 'user-alpzet-2', speedPercent: 65, temperatureC: 28.0, humidityPct: 55, occupantCount: 1, timestamp: Date.now() - 86400000 * 1 },
  { id: 'p8', userId: 'user-alpzet-2', speedPercent: 85, temperatureC: 32.0, humidityPct: 62, occupantCount: 1, timestamp: Date.now() - 3600000 * 6 },
  { id: 'p9', userId: 'user-alpzet-2', speedPercent: 70, temperatureC: 29.0, humidityPct: 56, occupantCount: 1, timestamp: Date.now() - 3600000 * 3 },
  { id: 'p10', userId: 'user-alpzet-2', speedPercent: 65, temperatureC: 27.5, humidityPct: 53, occupantCount: 1, timestamp: Date.now() - 3600000 * 1 },
];

// ============================================================================
// Store Creation
// ============================================================================
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ---- Initial State ----
      settings: DEFAULT_SETTINGS,
      fan: DEFAULT_FAN,
      sensor: DEFAULT_SENSOR,
      occupancy: {
        pirDetected: false,
        presentUsers: [],
        emptyRoomCountdown: null,
      },
      relay: { isOn: false },
      connectionStatus: 'disconnected',
      lastSuccessfulComm: null,
      users: SEED_USERS,
      preferenceRecords: SEED_PREFERENCES,
      automationSettings: {
        enabled: false,
        temperatureThresholdC: 30,
        humidityThresholdPct: 70,
        triggerOnTempExceed: true,
        triggerOnHumidityExceed: true,
        activateRelay: true,
      },
      automationEvents: [],
      systemEvents: [],
      speedDecision: null,
      temperatureHistory: [],
      humidityHistory: [],
      speedHistory: [],
      occupancyHistory: [],
      manualOverride: false,
      pollingTimer: null,
      emptyRoomTimer: null,

      // ======== Actions ========

      updateSettings: (partial) => {
        set((s) => {
          const newSettings = { ...s.settings, ...partial };
          // Update hardware service base URL if IP changed
          if (partial.esp32IpAddress) {
            hardwareService.setBaseUrl(partial.esp32IpAddress);
          }
          return { settings: newSettings };
        });
      },

      // ---- Fan Control ----

      setFanPower: async (on) => {
        const { settings, addSystemEvent } = get();

        if (settings.appMode === 'hardware') {
          const success = await hardwareService.setFanPower(on);
          if (!success) {
            addSystemEvent('error', 'Failed to send fan power command to ESP32.');
            return;
          }
        }

        set((s) => ({
          fan: { ...s.fan, isOn: on, speedPercent: on ? (s.fan.speedPercent || s.settings.defaultFanSpeed) : 0 },
        }));
        addSystemEvent('success', `Fan turned ${on ? 'ON' : 'OFF'}.`);
      },

      setFanSpeed: async (speed) => {
        const clamped = Math.max(0, Math.min(100, Math.round(speed)));
        const { settings, addSystemEvent } = get();

        if (settings.appMode === 'hardware') {
          const success = await hardwareService.setFanSpeed(clamped);
          if (!success) {
            addSystemEvent('error', 'Failed to send speed command to ESP32.');
            return;
          }
        }

        set((s) => ({
          fan: { ...s.fan, speedPercent: clamped, isOn: clamped > 0 },
        }));
      },

      setFanMode: async (mode) => {
        set((s) => ({ fan: { ...s.fan, mode } }));
        const { addSystemEvent, settings } = get();
        addSystemEvent('info', `Fan mode changed to ${mode}.`);

        if (settings.appMode === 'hardware') {
          await hardwareService.setFanMode(mode);
        }

        // When switching to personalized/automatic, run the logic immediately
        if (mode === 'personalized' || mode === 'automatic') {
          get().setManualOverride(false);
          get().runPersonalizedControl();
        }
      },

      setManualOverride: (override) => {
        set({ manualOverride: override });
        if (override) {
          get().addSystemEvent('info', 'Manual override activated.');
        }
      },

      // ---- Demo Sensor Controls ----

      setDemoTemperature: (temp) => {
        set((s) => ({
          sensor: { ...s.sensor, temperatureC: temp, lastUpdated: Date.now() },
        }));
        if (get().fan.mode !== 'manual' && !get().manualOverride) {
          get().runPersonalizedControl();
        }
      },

      setDemoHumidity: (humidity) => {
        set((s) => ({
          sensor: { ...s.sensor, humidityPct: humidity, lastUpdated: Date.now() },
        }));
        if (get().fan.mode !== 'manual' && !get().manualOverride) {
          get().runPersonalizedControl();
        }
      },

      // ---- Occupancy ----

      setDemoPirDetected: (detected) => {
        const { addSystemEvent, occupancy, settings } = get();
        set((s) => ({
          occupancy: { ...s.occupancy, pirDetected: detected },
        }));

        if (detected) {
          // Clear any empty room countdown
          const timer = get().emptyRoomTimer;
          if (timer) clearInterval(timer);
          set({ emptyRoomTimer: null, occupancy: { ...get().occupancy, emptyRoomCountdown: null } });
          addSystemEvent('info', 'Occupancy detected.');
        } else if (!detected && occupancy.presentUsers.length === 0) {
          // Start empty room countdown
          addSystemEvent('warning', `Room empty. Fan will turn off in ${settings.emptyRoomTimeoutSec}s.`);
          let countdown = settings.emptyRoomTimeoutSec;
          set((s) => ({
            occupancy: { ...s.occupancy, emptyRoomCountdown: countdown },
          }));
          const timer = setInterval(() => {
            countdown -= 1;
            if (countdown <= 0) {
              clearInterval(timer);
              set((s) => ({
                emptyRoomTimer: null,
                occupancy: { ...s.occupancy, emptyRoomCountdown: null },
              }));
              const f = get().fan;
              if (f.isOn && (f.mode === 'automatic' || f.mode === 'personalized') && !get().manualOverride) {
                get().setFanPower(false);
                addSystemEvent('info', 'Fan turned off – empty room timeout.');
              }
            } else {
              set((s) => ({
                occupancy: { ...s.occupancy, emptyRoomCountdown: countdown },
              }));
            }
          }, 1000);
          set({ emptyRoomTimer: timer });
        }
      },

      toggleUserPresence: (userId) => {
        set((s) => {
          const isPresent = s.occupancy.presentUsers.includes(userId);
          const newPresent = isPresent
            ? s.occupancy.presentUsers.filter((id) => id !== userId)
            : [...s.occupancy.presentUsers, userId];

          // Also update user profile
          const users = s.users.map((u) =>
            u.id === userId ? { ...u, isPresent: !isPresent } : u
          );

          return {
            occupancy: { ...s.occupancy, presentUsers: newPresent, pirDetected: newPresent.length > 0 || s.occupancy.pirDetected },
            users,
          };
        });

        const { addSystemEvent, users } = get();
        const user = users.find((u) => u.id === userId);
        const isNowPresent = get().occupancy.presentUsers.includes(userId);
        if (user) {
          addSystemEvent('info', `${user.name} ${isNowPresent ? 'entered' : 'left'} the room.`);
        }

        // Re-run personalized control if in auto mode
        if (get().fan.mode !== 'manual' && !get().manualOverride) {
          get().runPersonalizedControl();
        }
      },

      // ---- Users ----

      addUser: (name, icon) => {
        const colorIdx = get().users.length % PROFILE_COLORS.length;
        const newUser: UserProfile = {
          id: uuidv4(),
          name,
          icon,
          createdAt: Date.now(),
          isPresent: false,
          color: PROFILE_COLORS[colorIdx],
        };
        set((s) => ({ users: [...s.users, newUser] }));
        get().addSystemEvent('success', `User "${name}" created.`);
      },

      updateUser: (id, name, icon) => {
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, name, icon } : u)),
        }));
      },

      deleteUser: (id) => {
        const user = get().users.find((u) => u.id === id);
        set((s) => ({
          users: s.users.filter((u) => u.id !== id),
          preferenceRecords: s.preferenceRecords.filter((r) => r.userId !== id),
          occupancy: {
            ...s.occupancy,
            presentUsers: s.occupancy.presentUsers.filter((uid) => uid !== id),
          },
        }));
        if (user) get().addSystemEvent('info', `User "${user.name}" deleted.`);
      },

      // ---- Preferences ----

      recordPreference: (userId, speed) => {
        const { sensor, occupancy } = get();
        const record: PreferenceRecord = {
          id: uuidv4(),
          userId,
          speedPercent: speed,
          temperatureC: sensor.temperatureC,
          humidityPct: sensor.humidityPct,
          occupantCount: occupancy.presentUsers.length,
          timestamp: Date.now(),
        };
        set((s) => ({
          preferenceRecords: [...s.preferenceRecords, record],
        }));
      },

      clearUserPreferences: (userId) => {
        set((s) => ({
          preferenceRecords: s.preferenceRecords.filter((r) => r.userId !== userId),
        }));
        get().addSystemEvent('info', 'Preference history cleared.');
      },

      // ---- Automation ----

      updateAutomationSettings: async (partial) => {
        set((s) => ({
          automationSettings: { ...s.automationSettings, ...partial },
        }));
        const { automationSettings, settings, addSystemEvent } = get();
        addSystemEvent('info', 'Automation settings updated.');
        if (settings.appMode === 'hardware') {
          await hardwareService.setAutomationSettings({
            temperatureThresholdC: automationSettings.temperatureThresholdC,
            humidityThresholdPct: automationSettings.humidityThresholdPct,
            enabled: automationSettings.enabled,
          });
        }
      },

      setRelay: async (on) => {
        const { settings, addSystemEvent } = get();

        if (settings.appMode === 'hardware') {
          const success = await hardwareService.setRelay(on);
          if (!success) {
            addSystemEvent('error', 'Failed to send relay command to ESP32.');
            return;
          }
        }

        set({ relay: { isOn: on } });
        addSystemEvent('success', `Connected device turned ${on ? 'ON' : 'OFF'}.`);
      },

      // ---- Polling ----

      startPolling: () => {
        const { settings, stopPolling, addSystemEvent } = get();
        stopPolling();

        if (settings.appMode !== 'hardware') return;

        hardwareService.setBaseUrl(settings.esp32IpAddress);
        addSystemEvent('info', `Connecting to ESP32 at ${settings.esp32IpAddress}...`);

        const timer = setInterval(async () => {
          const response = await hardwareService.getStatus();
          if (response) {
            const mapped = hardwareService.mapApiResponseToStatus(response);
            const prevPir = get().occupancy.pirDetected;
            set((s) => ({
              // Take speed/on-off, sensor and relay from the ESP32; keep the app's mode,
              // simulated users and countdown
              fan: {
                ...s.fan,
                isOn: mapped.fan!.isOn,
                speedPercent: mapped.fan!.speedPercent,
              },
              sensor: mapped.sensor ?? s.sensor,
              relay: mapped.relay ?? s.relay,
              connectionStatus: 'connected',
              lastSuccessfulComm: Date.now(),
            }));

            const newPir = mapped.occupancy!.pirDetected;
            if (newPir !== prevPir) {
              get().setDemoPirDetected(newPir); // Starts or clears the countdown
            }

            // Continuously adapt personalized speed as physical ambient sensor updates
            if (get().fan.mode !== 'manual' && !get().manualOverride) {
              get().runPersonalizedControl();
            }
          } else {
            set({ connectionStatus: 'disconnected' });
          }
        }, settings.pollingIntervalMs);

        set({ pollingTimer: timer, connectionStatus: 'connecting' });
      },

      stopPolling: () => {
        const { pollingTimer } = get();
        if (pollingTimer) {
          clearInterval(pollingTimer);
          set({ pollingTimer: null });
        }
      },

      // ---- System Events ----

      addSystemEvent: (type, message) => {
        const event: SystemEvent = {
          id: uuidv4(),
          timestamp: Date.now(),
          type,
          message,
        };
        set((s) => ({
          systemEvents: [event, ...s.systemEvents].slice(0, 50), // Keep last 50
        }));
      },

      // ---- Automation Check ----

      runAutomationCheck: () => {
        const { automationSettings, sensor, relay, addSystemEvent, setRelay } = get();

        if (!automationSettings.enabled) return;

        const tempExceeded =
          automationSettings.triggerOnTempExceed &&
          sensor.temperatureC > automationSettings.temperatureThresholdC;
        const humExceeded =
          automationSettings.triggerOnHumidityExceed &&
          sensor.humidityPct > automationSettings.humidityThresholdPct;

        const shouldActivate = tempExceeded || humExceeded;

        // Dead-band hysteresis (1°C below for temp, 3% below for humidity) to prevent relay chattering
        const tempClear =
          !automationSettings.triggerOnTempExceed ||
          sensor.temperatureC < automationSettings.temperatureThresholdC - 1.0;
        const humClear =
          !automationSettings.triggerOnHumidityExceed ||
          sensor.humidityPct < automationSettings.humidityThresholdPct - 3.0;
        const shouldRelease = tempClear && humClear;

        if (shouldActivate && !relay.isOn && automationSettings.activateRelay) {
          setRelay(true);
          const trigger = tempExceeded
            ? `Temperature ${sensor.temperatureC.toFixed(1)}°C exceeded threshold ${automationSettings.temperatureThresholdC}°C`
            : `Humidity ${Math.round(sensor.humidityPct)}% exceeded threshold ${automationSettings.humidityThresholdPct}%`;

          const event: AutomationEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            trigger,
            action: 'Connected device activated',
            temperatureC: sensor.temperatureC,
            humidityPct: sensor.humidityPct,
            relayActivated: true,
          };
          set((s) => ({
            automationEvents: [event, ...s.automationEvents].slice(0, 100),
          }));
          addSystemEvent('info', `Automation triggered: ${trigger}`);
        } else if (shouldRelease && relay.isOn && automationSettings.activateRelay) {
          // Conditions cleared beyond dead-band hysteresis – deactivate relay
          setRelay(false);
          const event: AutomationEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            trigger: 'Conditions returned to normal (hysteresis cleared)',
            action: 'Connected device deactivated',
            temperatureC: sensor.temperatureC,
            humidityPct: sensor.humidityPct,
            relayActivated: false,
          };
          set((s) => ({
            automationEvents: [event, ...s.automationEvents].slice(0, 100),
          }));
        }
      },

      // ---- Personalized Control Logic ----

      runPersonalizedControl: () => {
        const { fan, occupancy, preferenceRecords, sensor, settings, users, manualOverride } = get();

        if (manualOverride || fan.mode === 'manual') return;

        const { speed, userSpeeds, explanation } = calculateMultiUserSpeed(
          occupancy.presentUsers,
          preferenceRecords,
          sensor.temperatureC,
          sensor.humidityPct,
          settings.defaultFanSpeed,
          settings.minLearningRecords
        );

        // Build explanation with user names
        const namedSpeeds = userSpeeds.map((us) => {
          const user = users.find((u) => u.id === us.userId);
          return { ...us, userName: user?.name ?? 'User' };
        });

        const names = namedSpeeds.map((u) => `${u.userName}: ${u.speed}%`).join(', ');
        const n = occupancy.presentUsers.length;
        const namedExplanation =
          n === 0
            ? explanation
            : n === 1
            ? `One registered user detected (${namedSpeeds[0].userName}). Applying preferred speed: ${speed}%.`
            : `${n} registered users detected. ${names}. Shared speed: ${speed}%.`;

        const decision: SpeedDecisionExplanation = {
          message: namedExplanation,
          userSpeeds: namedSpeeds,
          finalSpeed: speed,
          mode: fan.mode,
          timestamp: Date.now(),
        };

        set({ speedDecision: decision });

        // Apply the speed
        if (fan.isOn || occupancy.presentUsers.length > 0 || occupancy.pirDetected) {
          get().setFanSpeed(speed);
          if (!fan.isOn && speed > 0) {
            get().setFanPower(true);
          }
        }
      },

      // ---- History Push ----

      pushHistory: () => {
        const { sensor, fan, occupancy } = get();
        set((s) => ({
          temperatureHistory: pushToBuffer(s.temperatureHistory, sensor.temperatureC),
          humidityHistory: pushToBuffer(s.humidityHistory, sensor.humidityPct),
          speedHistory: pushToBuffer(s.speedHistory, fan.speedPercent),
          occupancyHistory: pushToBuffer(s.occupancyHistory, occupancy.presentUsers.length),
        }));
      },
    }),
    {
      name: 'aeropersona-storage',
      // Only persist specific keys, not timers or transient state
      partialize: (state) => ({
        settings: state.settings,
        users: state.users,
        preferenceRecords: state.preferenceRecords,
        automationSettings: state.automationSettings,
        automationEvents: state.automationEvents,
        systemEvents: state.systemEvents.slice(0, 20),
        temperatureHistory: state.temperatureHistory.slice(-100),
        humidityHistory: state.humidityHistory.slice(-100),
        speedHistory: state.speedHistory.slice(-100),
        occupancyHistory: state.occupancyHistory.slice(-100),
      }),
    }
  )
);
