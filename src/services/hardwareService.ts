// ============================================================================
// AeroPersona – Hardware Communication Service
// Handles all HTTP communication with the ESP32 controller
// ============================================================================

import type {
  ApiStatusResponse,
  ApiFanPowerRequest,
  ApiFanSpeedRequest,
  ApiFanModeRequest,
  ApiAutomationRequest,
  ApiRelayRequest,
  ConnectionStatus,
  SystemStatus,
} from '../types';

/** Timeout for HTTP requests to ESP32 (ms) */
const REQUEST_TIMEOUT = 5000;

class HardwareService {
  private baseUrl: string = 'http://192.168.1.100';
  private _connectionStatus: ConnectionStatus = 'disconnected';
  private _lastSuccessfulComm: number | null = null;
  private _onStatusChange?: (status: ConnectionStatus) => void;

  /** Update the ESP32 IP address */
  setBaseUrl(ip: string) {
    // Strip trailing slash and ensure http:// prefix
    const cleaned = ip.replace(/\/+$/, '');
    this.baseUrl = cleaned.startsWith('http') ? cleaned : `http://${cleaned}`;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /** Register a callback for connection status changes */
  onConnectionStatusChange(cb: (status: ConnectionStatus) => void) {
    this._onStatusChange = cb;
  }

  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  get lastSuccessfulComm(): number | null {
    return this._lastSuccessfulComm;
  }

  private setConnectionStatus(status: ConnectionStatus) {
    this._connectionStatus = status;
    this._onStatusChange?.(status);
  }

  /**
   * Make an HTTP request to the ESP32 with timeout handling.
   * Returns null on failure and updates connection status accordingly.
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T | null> {
    this.setConnectionStatus('connecting');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        this.setConnectionStatus('disconnected');
        return null;
      }

      const data = await response.json();
      this._lastSuccessfulComm = Date.now();
      this.setConnectionStatus('connected');
      return data as T;
    } catch {
      clearTimeout(timeout);
      this.setConnectionStatus('disconnected');
      return null;
    }
  }

  // ---- API Methods ----

  /** GET /api/status – Fetch full system status from ESP32 */
  async getStatus(): Promise<ApiStatusResponse | null> {
    return this.request<ApiStatusResponse>('GET', '/api/status');
  }

  /** POST /api/fan/power – Turn fan on or off */
  async setFanPower(on: boolean): Promise<boolean> {
    const body: ApiFanPowerRequest = { on };
    const result = await this.request('POST', '/api/fan/power', body);
    return result !== null;
  }

  /** POST /api/fan/speed – Set fan speed percentage (0-100) */
  async setFanSpeed(speedPercent: number): Promise<boolean> {
    const clamped = Math.max(0, Math.min(100, Math.round(speedPercent)));
    const body: ApiFanSpeedRequest = { speedPercent: clamped };
    const result = await this.request('POST', '/api/fan/speed', body);
    return result !== null;
  }

  /** POST /api/fan/mode – Set operating mode */
  async setFanMode(mode: string): Promise<boolean> {
    const body: ApiFanModeRequest = { mode };
    const result = await this.request('POST', '/api/fan/mode', body);
    return result !== null;
  }

  /** POST /api/automation/settings – Update automation configuration */
  async setAutomationSettings(settings: ApiAutomationRequest): Promise<boolean> {
    const result = await this.request('POST', '/api/automation/settings', settings);
    return result !== null;
  }

  /** POST /api/relay – Control the connected device relay */
  async setRelay(on: boolean): Promise<boolean> {
    const body: ApiRelayRequest = { on };
    const result = await this.request('POST', '/api/relay', body);
    return result !== null;
  }

  /**
   * Map the raw API response to our internal SystemStatus type.
   * This keeps the rest of the app decoupled from the wire format.
   */
  mapApiResponseToStatus(response: ApiStatusResponse): Partial<SystemStatus> {
    return {
      fan: {
        isOn: response.fan.on,
        speedPercent: response.fan.speedPercent,
        mode: response.fan.mode as SystemStatus['fan']['mode'],
      },
      sensor: {
        temperatureC: response.sensor.temperatureC,
        humidityPct: response.sensor.humidityPct,
        lastUpdated: Date.now(),
        sensorOnline: response.sensor.sensorOnline ?? (response.sensor.temperatureC > 0 && response.sensor.humidityPct > 0),
      },
      occupancy: {
        pirDetected: response.occupancy.pirDetected,
        presentUsers: response.occupancy.usersPresent,
        emptyRoomCountdown: null,
      },
      relay: {
        isOn: response.relay.on,
      },
      connectionStatus: 'connected',
      lastSuccessfulComm: Date.now(),
    };
  }
}

// Singleton instance
export const hardwareService = new HardwareService();
