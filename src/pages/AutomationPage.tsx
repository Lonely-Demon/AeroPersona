import React from 'react';
import {
  Zap,
  Sliders,
  Activity,
  History,
  Power,
  SlidersHorizontal,
  Flame,
  Droplets,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatDateTime } from '../utils';
import './AutomationPage.css';

const AutomationPage: React.FC = () => {
  const automationSettings = useAppStore((s) => s.automationSettings);
  const automationEvents = useAppStore((s) => s.automationEvents);
  const sensor = useAppStore((s) => s.sensor);
  const relay = useAppStore((s) => s.relay);
  const settings = useAppStore((s) => s.settings);

  const updateAutomationSettings = useAppStore((s) => s.updateAutomationSettings);
  const setRelay = useAppStore((s) => s.setRelay);
  const setDemoTemperature = useAppStore((s) => s.setDemoTemperature);
  const setDemoHumidity = useAppStore((s) => s.setDemoHumidity);

  const isTempExceeded = sensor.temperatureC > automationSettings.temperatureThresholdC;
  const isHumExceeded = sensor.humidityPct > automationSettings.humidityThresholdPct;

  // Calculate percentage of threshold reached (for progress bars)
  const tempProgress = Math.min(
    100,
    Math.max(0, (sensor.temperatureC / automationSettings.temperatureThresholdC) * 100)
  );
  const humProgress = Math.min(
    100,
    Math.max(0, (sensor.humidityPct / automationSettings.humidityThresholdPct) * 100)
  );

  return (
    <div className="page-container automation-page">
      {/* Header with Master Switch */}
      <div className="automation-header">
        <div>
          <h1>Smart Automation</h1>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            Environmental Rule Engine & Relay Control
          </div>
        </div>

        <div className="master-toggle">
          <span className={`status-badge ${automationSettings.enabled ? 'active' : 'disabled'}`}>
            <span className="status-badge-dot" />
            {automationSettings.enabled ? 'Engine Active' : 'Engine Disabled'}
          </span>
          <label className="auto-toggle-switch">
            <input
              type="checkbox"
              checked={automationSettings.enabled}
              onChange={(e) => updateAutomationSettings({ enabled: e.target.checked })}
            />
            <span className="auto-toggle-slider" />
          </label>
        </div>
      </div>

      {/* Demo Mode Environmental Simulator Controls */}
      {settings.appMode === 'demo' && (
        <div className="demo-mode-section">
          <h2>
            <SlidersHorizontal size={18} />
            <span>Interactive Environmental Simulator</span>
          </h2>

          <div className="demo-slider-group">
            <div className="demo-slider-header">
              <span>Ambient Temperature Simulator</span>
              <span className="demo-slider-value">{sensor.temperatureC.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              min={15}
              max={45}
              step={0.5}
              value={sensor.temperatureC}
              onChange={(e) => setDemoTemperature(parseFloat(e.target.value))}
              className="threshold-slider"
            />
          </div>

          <div className="demo-slider-group">
            <div className="demo-slider-header">
              <span>Relative Humidity Simulator</span>
              <span className="demo-slider-value">{Math.round(sensor.humidityPct)}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={95}
              step={1}
              value={sensor.humidityPct}
              onChange={(e) => setDemoHumidity(parseInt(e.target.value, 10))}
              className="threshold-slider"
            />
          </div>
        </div>
      )}

      {/* Live Conditions vs Thresholds Comparison */}
      <div className="auto-section">
        <h2>
          <Activity size={18} />
          <span>Threshold Monitor</span>
        </h2>

        <div className="conditions-grid">
          {/* Temperature Condition Card */}
          <div className="condition-card">
            <div className="condition-card-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={16} /> Temperature
              </span>
              <span className={`condition-status ${isTempExceeded ? 'exceeded' : 'safe'}`}>
                {isTempExceeded ? 'THRESHOLD EXCEEDED' : 'NORMAL'}
              </span>
            </div>

            <div className="condition-values">
              <span className="condition-current">{sensor.temperatureC.toFixed(1)}°C</span>
              <span className="condition-threshold">
                Limit: {automationSettings.temperatureThresholdC}°C
              </span>
            </div>

            <div className="condition-progress">
              <div
                className={`condition-progress-bar ${
                  isTempExceeded ? 'exceeded' : tempProgress > 85 ? 'warning' : 'safe'
                }`}
                style={{ width: `${tempProgress}%` }}
              />
            </div>
          </div>

          {/* Humidity Condition Card */}
          <div className="condition-card">
            <div className="condition-card-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Droplets size={16} /> Relative Humidity
              </span>
              <span className={`condition-status ${isHumExceeded ? 'exceeded' : 'safe'}`}>
                {isHumExceeded ? 'THRESHOLD EXCEEDED' : 'NORMAL'}
              </span>
            </div>

            <div className="condition-values">
              <span className="condition-current">{Math.round(sensor.humidityPct)}%</span>
              <span className="condition-threshold">
                Limit: {automationSettings.humidityThresholdPct}%
              </span>
            </div>

            <div className="condition-progress">
              <div
                className={`condition-progress-bar ${
                  isHumExceeded ? 'exceeded' : humProgress > 85 ? 'warning' : 'safe'
                }`}
                style={{ width: `${humProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Threshold Configuration Section */}
      <div className="auto-section">
        <h2>
          <Sliders size={18} />
          <span>Trigger Thresholds</span>
        </h2>

        {/* Temperature threshold */}
        <div className="threshold-group">
          <div className="threshold-label-row">
            <span className="threshold-label">Temperature Trigger Threshold</span>
            <div className="threshold-value-input">
              <input
                type="number"
                min={18}
                max={45}
                value={automationSettings.temperatureThresholdC}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) updateAutomationSettings({ temperatureThresholdC: val });
                }}
              />
              <span className="threshold-unit">°C</span>
            </div>
          </div>
          <input
            type="range"
            min={18}
            max={45}
            step={0.5}
            value={automationSettings.temperatureThresholdC}
            onChange={(e) =>
              updateAutomationSettings({ temperatureThresholdC: parseFloat(e.target.value) })
            }
            className="threshold-slider"
          />
        </div>

        {/* Humidity threshold */}
        <div className="threshold-group">
          <div className="threshold-label-row">
            <span className="threshold-label">Humidity Trigger Threshold</span>
            <div className="threshold-value-input">
              <input
                type="number"
                min={30}
                max={90}
                value={automationSettings.humidityThresholdPct}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) updateAutomationSettings({ humidityThresholdPct: val });
                }}
              />
              <span className="threshold-unit">%</span>
            </div>
          </div>
          <input
            type="range"
            min={30}
            max={90}
            step={1}
            value={automationSettings.humidityThresholdPct}
            onChange={(e) =>
              updateAutomationSettings({ humidityThresholdPct: parseInt(e.target.value, 10) })
            }
            className="threshold-slider"
          />
        </div>

        {/* Trigger check toggles */}
        <div className="toggle-row">
          <div className="toggle-row-label">
            <span>Trigger on Temperature Exceed</span>
            <span>Activate rule when ambient temperature rises above limit</span>
          </div>
          <label className="auto-toggle-switch">
            <input
              type="checkbox"
              checked={automationSettings.triggerOnTempExceed}
              onChange={(e) =>
                updateAutomationSettings({ triggerOnTempExceed: e.target.checked })
              }
            />
            <span className="auto-toggle-slider" />
          </label>
        </div>

        <div className="toggle-row">
          <div className="toggle-row-label">
            <span>Trigger on Humidity Exceed</span>
            <span>Activate rule when relative humidity rises above limit</span>
          </div>
          <label className="auto-toggle-switch">
            <input
              type="checkbox"
              checked={automationSettings.triggerOnHumidityExceed}
              onChange={(e) =>
                updateAutomationSettings({ triggerOnHumidityExceed: e.target.checked })
              }
            />
            <span className="auto-toggle-slider" />
          </label>
        </div>
      </div>

      {/* Connected-Device Relay Section */}
      <div className="auto-section">
        <h2>
          <Zap size={18} />
          <span>Auxiliary Connected Device (Relay)</span>
        </h2>

        <div className="relay-status-indicator">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`relay-dot ${relay.isOn ? 'on' : 'off'}`} />
            <span className="relay-status-text">
              Relay Device: {relay.isOn ? 'ENERGIZED / ON' : 'DE-ENERGIZED / OFF'}
            </span>
          </div>
          <button
            className={`btn btn-sm ${relay.isOn ? 'btn-danger' : 'btn-success'}`}
            onClick={() => setRelay(!relay.isOn)}
          >
            <Power size={14} />
            {relay.isOn ? 'Turn Relay Off' : 'Turn Relay On'}
          </button>
        </div>

        <div className="toggle-row" style={{ marginTop: '12px' }}>
          <div className="toggle-row-label">
            <span>Automatic Relay Engagement</span>
            <span>Energize relay module automatically when threshold is breached</span>
          </div>
          <label className="auto-toggle-switch">
            <input
              type="checkbox"
              checked={automationSettings.activateRelay}
              onChange={(e) => updateAutomationSettings({ activateRelay: e.target.checked })}
            />
            <span className="auto-toggle-slider" />
          </label>
        </div>
      </div>

      {/* Automation Event History */}
      <div className="auto-section">
        <h2>
          <History size={18} />
          <span>Automation Event Log</span>
        </h2>

        <div className="events-list">
          {automationEvents.length > 0 ? (
            automationEvents.map((evt) => (
              <div key={evt.id} className="event-card">
                <div
                  className={`event-icon ${evt.relayActivated ? 'relay-on' : 'relay-off'}`}
                >
                  <Zap size={16} />
                </div>
                <div className="event-body">
                  <div className="event-trigger">{evt.trigger}</div>
                  <div className="event-action">{evt.action}</div>
                  <div className="event-readings">
                    Condition: {evt.temperatureC.toFixed(1)}°C &bull; {Math.round(evt.humidityPct)}% RH
                  </div>
                  <div className="event-time">{formatDateTime(evt.timestamp)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="events-empty">
              No automation triggers recorded yet. When environmental thresholds are exceeded, actions are logged here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutomationPage;
