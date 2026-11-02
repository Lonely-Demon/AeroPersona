import React, { useState, useRef } from 'react';
import {
  Cpu,
  Moon,
  Sun,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  Radio,
  Sliders,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { hardwareService } from '../services/hardwareService';
import { isValidIpOrHostname, formatTime } from '../utils';
import type { AppMode } from '../types';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const settings = useAppStore((s) => s.settings);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const lastSuccessfulComm = useAppStore((s) => s.lastSuccessfulComm);
  const users = useAppStore((s) => s.users);
  const preferenceRecords = useAppStore((s) => s.preferenceRecords);

  const updateSettings = useAppStore((s) => s.updateSettings);
  const startPolling = useAppStore((s) => s.startPolling);
  const stopPolling = useAppStore((s) => s.stopPolling);
  const addSystemEvent = useAppStore((s) => s.addSystemEvent);

  const [ipInput, setIpInput] = useState(settings.esp32IpAddress);
  const [ipError, setIpError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Dialog modals
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmClearDataOpen, setConfirmClearDataOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle mode toggle (Demo vs Hardware)
  const handleModeChange = (isHardware: boolean) => {
    const newMode: AppMode = isHardware ? 'hardware' : 'demo';
    updateSettings({ appMode: newMode });
    if (newMode === 'hardware') {
      startPolling();
    } else {
      stopPolling();
    }
    addSystemEvent('info', `Switched to ${newMode.toUpperCase()} mode.`);
  };

  // Handle IP address save & test
  const handleIpSave = () => {
    const trimmed = ipInput.trim();
    if (!isValidIpOrHostname(trimmed)) {
      setIpError('Please enter a valid IPv4 address or hostname');
      return;
    }
    setIpError('');
    updateSettings({ esp32IpAddress: trimmed });
    hardwareService.setBaseUrl(trimmed);
    addSystemEvent('info', `ESP32 IP address updated to ${trimmed}`);
  };

  const handleTestConnection = async () => {
    handleIpSave();
    if (ipError) return;

    setTestingConnection(true);
    setTestResult(null);

    hardwareService.setBaseUrl(ipInput.trim());
    const res = await hardwareService.getStatus();

    setTestingConnection(false);
    if (res) {
      setTestResult({
        success: true,
        msg: `Connection successful! ESP32 responded with status.`,
      });
      addSystemEvent('success', 'ESP32 connection test passed.');
    } else {
      setTestResult({
        success: false,
        msg: `Connection failed. Make sure the ESP32 is powered on, connected to the same Wi-Fi, and reachable at http://${ipInput.trim()}`,
      });
      addSystemEvent('error', 'ESP32 connection test failed.');
    }
  };

  // Export all application state as JSON
  const handleExportData = () => {
    const exportPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      app: 'AeroPersona',
      team: 'ALPZET MATRIX',
      settings,
      users,
      preferenceRecords,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AeroPersona-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addSystemEvent('info', 'Exported application data backup.');
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.users && Array.isArray(data.users)) {
          useAppStore.setState({
            users: data.users,
            preferenceRecords: data.preferenceRecords || [],
            settings: { ...settings, ...(data.settings || {}) },
          });
          addSystemEvent('success', 'Imported data successfully!');
        } else {
          alert('Invalid AeroPersona backup file.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Reset all to defaults
  const handleResetDefaults = () => {
    localStorage.removeItem('aeropersona-storage');
    window.location.reload();
  };

  // Clear learning data only
  const handleClearAllPreferences = () => {
    useAppStore.setState({ preferenceRecords: [], automationEvents: [] });
    setConfirmClearDataOpen(false);
    addSystemEvent('info', 'Cleared all learning records and automation logs.');
  };

  return (
    <div className="page-container settings-page">
      <h1>Settings</h1>
      <div className="page-subtitle">Hardware connection, automation parameters & system config</div>

      {/* Operating Environment Section */}
      <div className="settings-section">
        <div className="section-header">
          <Radio size={20} />
          <h2>Operating Mode</h2>
        </div>
        <div className="section-description">
          Toggle between simulated evaluation mode and physical ESP32 Wi-Fi hardware mode.
        </div>

        <div className="toggle-field">
          <div className="toggle-info">
            <span className="toggle-label">Physical Hardware Mode</span>
            <span className="toggle-description">
              When enabled, connects to ESP32 over local Wi-Fi. When disabled, uses simulated telemetry and occupancy.
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.appMode === 'hardware'}
              onChange={(e) => handleModeChange(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        {settings.appMode === 'demo' ? (
          <div className="warning-box" style={{ borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.1)' }}>
            <Info size={18} color="var(--accent-yellow)" />
            <span>
              <strong>Demo Mode:</strong> You can simulate temperature, humidity, and user presence directly without requiring the physical ESP32 controller.
            </span>
          </div>
        ) : (
          <div className="warning-box">
            <AlertTriangle size={18} color="var(--accent-blue)" />
            <span>
              <strong>Hardware Mode:</strong> Ensure your phone/browser device is on the same local Wi-Fi network as the ESP32 module.
            </span>
          </div>
        )}
      </div>

      {/* Hardware Connection Config */}
      <div className="settings-section">
        <div className="section-header">
          <Cpu size={20} />
          <h2>ESP32 Hardware Interface</h2>
        </div>
        <div className="section-description">
          Configure REST API network endpoint for the ESP32 DevKit V1 controller.
        </div>

        <div className="form-field">
          <label>ESP32 IP Address or Hostname</label>
          <div className="field-description">
            The local network IP assigned to the ESP32 (e.g., 192.168.1.100 or aeropersona.local)
          </div>
          <input
            type="text"
            className={ipError ? 'input-error' : ''}
            value={ipInput}
            onChange={(e) => {
              setIpInput(e.target.value);
              if (ipError) setIpError('');
            }}
            placeholder="192.168.1.100"
          />
          {ipError && <div className="error-text">{ipError}</div>}
        </div>

        <div className="form-field">
          <label>Polling Interval</label>
          <div className="field-description">How frequently the app queries /api/status</div>
          <select
            value={settings.pollingIntervalMs}
            onChange={(e) =>
              updateSettings({ pollingIntervalMs: parseInt(e.target.value, 10) })
            }
          >
            <option value={1000}>1 second (High Responsiveness)</option>
            <option value={2000}>2 seconds (Standard)</option>
            <option value={3000}>3 seconds (Balanced - Recommended)</option>
            <option value={5000}>5 seconds (Battery Efficient)</option>
            <option value={10000}>10 seconds (Low Bandwidth)</option>
          </select>
        </div>

        <div className="btn-row">
          <button
            className="settings-btn primary"
            onClick={handleTestConnection}
            disabled={testingConnection}
          >
            {testingConnection ? 'Testing Connection...' : 'Test Connection'}
          </button>
          <button className="settings-btn secondary" onClick={handleIpSave}>
            Save Configuration
          </button>
        </div>

        {testResult && (
          <div
            className={`warning-box ${testResult.success ? '' : ''}`}
            style={{
              borderColor: testResult.success ? 'var(--accent-green)' : 'var(--accent-red)',
              background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            }}
          >
            {testResult.success ? (
              <CheckCircle size={18} color="var(--accent-green)" />
            ) : (
              <AlertTriangle size={18} color="var(--accent-red)" />
            )}
            <span>{testResult.msg}</span>
          </div>
        )}

        <div className="connection-status">
          <span className={`status-dot ${connectionStatus}`} />
          <span>
            Current Status: <strong>{connectionStatus.toUpperCase()}</strong>
            {lastSuccessfulComm && (
              <> &bull; Last ACK: {formatTime(lastSuccessfulComm)}</>
            )}
          </span>
        </div>
      </div>

      {/* Fan & Room Defaults */}
      <div className="settings-section">
        <div className="section-header">
          <Sliders size={20} />
          <h2>Fan & Occupancy Defaults</h2>
        </div>

        <div className="slider-field">
          <label>
            <span>Default Fallback Fan Speed</span>
            <span className="slider-value">{settings.defaultFanSpeed}%</span>
          </label>
          <div className="field-description">
            Speed applied when no registered user preference exists or when anonymous room occupancy is detected.
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={settings.defaultFanSpeed}
            onChange={(e) =>
              updateSettings({ defaultFanSpeed: parseInt(e.target.value, 10) })
            }
          />
        </div>

        <div className="form-field">
          <label>Empty Room Auto-Off Countdown (Seconds)</label>
          <div className="field-description">
            Seconds to wait after PIR motion ceases and all users leave before turning the fan OFF.
          </div>
          <input
            type="number"
            min={10}
            max={600}
            value={settings.emptyRoomTimeoutSec}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) updateSettings({ emptyRoomTimeoutSec: val });
            }}
          />
        </div>

        <div className="form-field">
          <label>Minimum Learning Records Before Model Maturity</label>
          <div className="field-description">
            Number of recorded speed selections required before moving from "Insufficient Data" to "Learning".
          </div>
          <input
            type="number"
            min={2}
            max={20}
            value={settings.minLearningRecords}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) updateSettings({ minLearningRecords: val });
            }}
          />
        </div>
      </div>

      {/* Appearance & Theme */}
      <div className="settings-section">
        <div className="section-header">
          {settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          <h2>Appearance</h2>
        </div>

        <div className="toggle-field">
          <div className="toggle-info">
            <span className="toggle-label">Dark Theme</span>
            <span className="toggle-description">
              Switch between premium high-contrast dark dashboard and clean light UI.
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.theme === 'dark'}
              onChange={(e) =>
                updateSettings({ theme: e.target.checked ? 'dark' : 'light' })
              }
            />
            <span className="slider" />
          </label>
        </div>
      </div>

      {/* Data Management */}
      <div className="settings-section">
        <div className="section-header">
          <Shield size={20} />
          <h2>Data Management & Backup</h2>
        </div>
        <div className="section-description">
          Export profiles and learned models, or restore from a previous backup.
        </div>

        <div className="btn-row">
          <button className="settings-btn secondary" onClick={handleExportData}>
            <Download size={16} /> Export JSON Backup
          </button>

          <button
            className="settings-btn secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} /> Import Backup
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="file-input-hidden"
            accept=".json"
            onChange={handleImportFile}
          />
        </div>

        <div className="btn-row" style={{ marginTop: '12px' }}>
          <button
            className="settings-btn danger"
            onClick={() => setConfirmClearDataOpen(true)}
          >
            <Trash2 size={16} /> Clear Preference Records
          </button>

          <button
            className="settings-btn danger"
            onClick={() => setConfirmResetOpen(true)}
          >
            <RotateCcw size={16} /> Factory Reset All Settings
          </button>
        </div>
      </div>

      {/* About Section */}
      <div className="settings-section">
        <div className="section-header">
          <Info size={20} />
          <h2>About AeroPersona</h2>
        </div>

        <div className="about-grid">
          <div className="about-label">Project:</div>
          <div className="about-value">AeroPersona – Personalized Multi-User Smart Fan</div>

          <div className="about-label">Team:</div>
          <div className="about-value">ALPZET MATRIX</div>

          <div className="about-label">Competition:</div>
          <div className="about-value">atomQUEST 2026 – Round 2 Prototype</div>

          <div className="about-label">Hardware Stack:</div>
          <div className="about-value">
            ESP32 DevKit V1 &bull; DHT11 &bull; HC-SR501 PIR &bull; L298N PWM &bull; Relay Module &bull; 12V DC Motor
          </div>

          <div className="about-label">Version:</div>
          <div className="about-value">v1.2.0 (Production Mobile-First Web PWA)</div>
        </div>

        <div className="about-description">
          AeroPersona learns individual thermal and airflow preferences for every registered member in the home. Using weighted environmental similarity and dynamic multi-user reconciliation, it provides optimal acoustic and thermal comfort while reducing unnecessary energy consumption.
        </div>
      </div>

      {/* Confirmation Dialogs */}
      {confirmResetOpen && (
        <div className="confirm-overlay" onClick={() => setConfirmResetOpen(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Reset All Settings?</h3>
            <p>
              This will restore all default configuration parameters and reload the application. User profiles will be preserved unless explicitly deleted.
            </p>
            <div className="dialog-actions">
              <button
                className="settings-btn secondary"
                onClick={() => setConfirmResetOpen(false)}
              >
                Cancel
              </button>
              <button className="settings-btn danger" onClick={handleResetDefaults}>
                Yes, Reset Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmClearDataOpen && (
        <div className="confirm-overlay" onClick={() => setConfirmClearDataOpen(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Clear Preference History?</h3>
            <p>
              This will delete all recorded fan speed data points and reset the machine learning models for all users. Profile identities will be kept.
            </p>
            <div className="dialog-actions">
              <button
                className="settings-btn secondary"
                onClick={() => setConfirmClearDataOpen(false)}
              >
                Cancel
              </button>
              <button className="settings-btn danger" onClick={handleClearAllPreferences}>
                Yes, Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
