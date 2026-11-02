// ============================================================================
// AeroPersona – Core Type Definitions
// All shared interfaces and types for the smart fan application
// ============================================================================

/** Operating mode for the fan system */
export type FanMode = 'manual' | 'personalized' | 'automatic';

/** Hardware connection status */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

/** Application operating environment */
export type AppMode = 'demo' | 'hardware';

/** Theme preference */
export type ThemeMode = 'dark' | 'light';

/** Unique identifier type */
export type UserId = string;

// ---- User & Profile Types ----

export interface UserProfile {
  id: UserId;
  name: string;
  icon: string;           // emoji or icon identifier
  createdAt: number;       // timestamp ms
  isPresent: boolean;      // currently detected in room
  color: string;           // assigned profile color for charts
}

// ---- Preference Learning Types ----

/** A single recorded preference data point */
export interface PreferenceRecord {
  id: string;
  userId: UserId;
  speedPercent: number;
  temperatureC: number;
  humidityPct: number;
  occupantCount: number;
  timestamp: number;
}

/** Learned preference summary for a user */
export interface UserPreferenceSummary {
  userId: UserId;
  totalSamples: number;
  estimatedSpeedAtCurrentConditions: number | null;
  learningStatus: 'insufficient_data' | 'learning' | 'stable';
  /** Minimum samples needed for "learning" status */
  minSamplesRequired: number;
}

// ---- Sensor & Hardware Types ----

export interface SensorData {
  temperatureC: number;
  humidityPct: number;
  lastUpdated: number;     // timestamp ms
  sensorOnline: boolean;
}

export interface FanState {
  isOn: boolean;
  speedPercent: number;    // 0-100 requested speed
  mode: FanMode;
}

export interface OccupancyState {
  pirDetected: boolean;
  presentUsers: UserId[];
  emptyRoomCountdown: number | null;  // seconds remaining, null if not counting
}

export interface RelayState {
  isOn: boolean;
}

/** Full system status as returned by ESP32 */
export interface SystemStatus {
  fan: FanState;
  sensor: SensorData;
  occupancy: OccupancyState;
  relay: RelayState;
  connectionStatus: ConnectionStatus;
  lastSuccessfulComm: number | null;   // timestamp ms
}

// ---- Automation Types ----

export interface AutomationSettings {
  enabled: boolean;
  temperatureThresholdC: number;
  humidityThresholdPct: number;
  triggerOnTempExceed: boolean;
  triggerOnHumidityExceed: boolean;
  activateRelay: boolean;
}

export interface AutomationEvent {
  id: string;
  timestamp: number;
  trigger: string;          // human-readable trigger description
  action: string;           // human-readable action description
  temperatureC: number;
  humidityPct: number;
  relayActivated: boolean;
}

// ---- Analytics History Types ----

export interface HistoryDataPoint {
  timestamp: number;
  value: number;
}

export interface SpeedDecisionExplanation {
  message: string;
  userSpeeds: { userId: UserId; userName: string; speed: number }[];
  finalSpeed: number;
  mode: FanMode;
  timestamp: number;
}

// ---- System Event Types ----

export interface SystemEvent {
  id: string;
  timestamp: number;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

// ---- App Settings ----

export interface AppSettings {
  appMode: AppMode;
  theme: ThemeMode;
  esp32IpAddress: string;
  defaultFanSpeed: number;         // 0-100
  emptyRoomTimeoutSec: number;     // seconds before fan off in empty room
  pollingIntervalMs: number;       // how often to poll ESP32
  minLearningRecords: number;      // minimum records before learning kicks in
}

// ---- API Request/Response Types ----

export interface ApiStatusResponse {
  fan: {
    on: boolean;
    speedPercent: number;
    mode: string;
  };
  sensor: {
    temperatureC: number;
    humidityPct: number;
    sensorOnline?: boolean;
  };
  occupancy: {
    pirDetected: boolean;
    usersPresent: string[];
  };
  relay: {
    on: boolean;
  };
}

export interface ApiFanPowerRequest {
  on: boolean;
}

export interface ApiFanSpeedRequest {
  speedPercent: number;
}

export interface ApiFanModeRequest {
  mode: string;
}

export interface ApiAutomationRequest {
  temperatureThresholdC: number;
  humidityThresholdPct: number;
  enabled: boolean;
}

export interface ApiRelayRequest {
  on: boolean;
}
