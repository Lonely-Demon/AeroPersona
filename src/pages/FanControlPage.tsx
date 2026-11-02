import React, { useState } from 'react';
import {
  Power,
  Minus,
  Plus,
  Hand,
  Brain,
  Cpu,
  Radio,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatTime } from '../utils';
import type { FanMode } from '../types';
import './FanControlPage.css';

const FanControlPage: React.FC = () => {
  const fan = useAppStore((s) => s.fan);
  const occupancy = useAppStore((s) => s.occupancy);
  const users = useAppStore((s) => s.users);
  const settings = useAppStore((s) => s.settings);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const lastSuccessfulComm = useAppStore((s) => s.lastSuccessfulComm);
  const manualOverride = useAppStore((s) => s.manualOverride);
  const speedDecision = useAppStore((s) => s.speedDecision);

  const setFanPower = useAppStore((s) => s.setFanPower);
  const setFanSpeed = useAppStore((s) => s.setFanSpeed);
  const setFanMode = useAppStore((s) => s.setFanMode);
  const setManualOverride = useAppStore((s) => s.setManualOverride);
  const recordPreference = useAppStore((s) => s.recordPreference);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to record preference for all detected users when speed is adjusted manually
  const triggerPreferenceRecord = (speed: number) => {
    if (occupancy.presentUsers.length > 0) {
      occupancy.presentUsers.forEach((userId) => {
        recordPreference(userId, speed);
      });
      const names = occupancy.presentUsers
        .map((id) => users.find((u) => u.id === id)?.name ?? 'User')
        .join(', ');
      setToastMessage(`Learned preference: ${speed}% recorded for ${names}`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newSpeed)));
    setFanSpeed(clamped);
    triggerPreferenceRecord(clamped);
  };

  const handlePowerToggle = () => {
    setFanPower(!fan.isOn);
  };

  const handleStepSpeed = (delta: number) => {
    handleSpeedChange(fan.speedPercent + delta);
  };

  const handleModeChange = (mode: FanMode) => {
    setFanMode(mode);
  };

  // Determine if controls are locked by auto mode without manual override
  const isAutoControlled = (fan.mode === 'personalized' || fan.mode === 'automatic') && !manualOverride;

  return (
    <div className="page-container fan-control-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="preference-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Power Section */}
      <div className="power-section">
        <button
          className={`power-button ${fan.isOn ? 'power-on' : ''}`}
          onClick={handlePowerToggle}
          aria-label={fan.isOn ? 'Turn fan off' : 'Turn fan on'}
        >
          <Power size={36} />
        </button>
        <div className={`power-status-text ${fan.isOn ? 'is-on' : ''}`}>
          {fan.isOn ? `Fan is Running (${fan.speedPercent}%)` : 'Fan is Powered Off'}
        </div>
      </div>

      {/* Speed Control Section */}
      <div className="speed-section">
        <div className="section-title">Requested Fan Speed</div>

        <div className="speed-gauge-container">
          <div className="speed-gauge">
            <div className="speed-gauge-inner">
              <span className="speed-value">{fan.isOn ? fan.speedPercent : 0}</span>
              <span className="speed-unit">%</span>
            </div>
          </div>
        </div>

        {/* Adjust Buttons and Numerical Input */}
        <div className="speed-adjust-row">
          <button
            className="speed-step-btn"
            onClick={() => handleStepSpeed(-5)}
            disabled={!fan.isOn || isAutoControlled || fan.speedPercent <= 0}
            title="Decrease by 5%"
          >
            <Minus size={20} />
          </button>

          <div className="speed-input-wrapper">
            <input
              type="number"
              className="speed-input"
              value={fan.isOn ? fan.speedPercent : 0}
              min={0}
              max={100}
              disabled={!fan.isOn || isAutoControlled}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) handleSpeedChange(val);
              }}
            />
            <span className="speed-input-suffix">%</span>
          </div>

          <button
            className="speed-step-btn"
            onClick={() => handleStepSpeed(5)}
            disabled={!fan.isOn || isAutoControlled || fan.speedPercent >= 100}
            title="Increase by 5%"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Range Slider */}
        <div className="speed-slider-container">
          <input
            type="range"
            className="speed-slider"
            min={0}
            max={100}
            value={fan.isOn ? fan.speedPercent : 0}
            disabled={!fan.isOn || isAutoControlled}
            onChange={(e) => handleSpeedChange(parseInt(e.target.value, 10))}
          />
          <div className="speed-slider-labels">
            <span>0% (Off)</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100% (Max)</span>
          </div>
        </div>
      </div>

      {/* Operating Mode Segmented Control */}
      <div className="mode-section">
        <div className="section-title">Operating Mode</div>
        <div className="mode-segmented">
          <button
            className={`mode-btn ${fan.mode === 'manual' ? 'mode-btn-active' : ''}`}
            onClick={() => handleModeChange('manual')}
          >
            <Hand size={16} />
            <span>Manual</span>
          </button>
          <button
            className={`mode-btn ${fan.mode === 'personalized' ? 'mode-btn-active' : ''}`}
            onClick={() => handleModeChange('personalized')}
          >
            <Brain size={16} />
            <span>Personalized</span>
          </button>
          <button
            className={`mode-btn ${fan.mode === 'automatic' ? 'mode-btn-active' : ''}`}
            onClick={() => handleModeChange('automatic')}
          >
            <Cpu size={16} />
            <span>Automatic</span>
          </button>
        </div>
      </div>

      {/* Manual Override (Available in Personalized/Automatic Mode) */}
      {fan.mode !== 'manual' && (
        <div className="override-section">
          <div className="override-label">
            <div className="override-title">Manual Override</div>
            <div className="override-subtitle">
              Temporarily override algorithm recommendations with custom speed
            </div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={manualOverride}
              onChange={(e) => setManualOverride(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      )}

      {/* Speed Decision Explanation in Auto/Personalized Mode */}
      {fan.mode !== 'manual' && speedDecision && (
        <div className="speed-decision">
          <div className="speed-decision-title">
            <Sparkles size={16} />
            <span>Algorithm Decision Breakdown</span>
          </div>
          <div className="speed-decision-message">{speedDecision.message}</div>
          {speedDecision.userSpeeds.length > 0 && (
            <div className="speed-decision-users">
              {speedDecision.userSpeeds.map((u) => (
                <div key={u.userId} className="speed-decision-user">
                  <span>👤 {u.userName}</span>
                  <span className="speed-decision-user-speed">{u.speed}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Connection & Hardware Status Bar */}
      <div className="connection-bar">
        <div className="connection-info">
          <Radio size={16} />
          <span className={`connection-label ${settings.appMode === 'demo' ? 'connected' : connectionStatus}`}>
            {settings.appMode === 'demo'
              ? 'Demo Environment'
              : connectionStatus === 'connected'
              ? `ESP32 Connected (${settings.esp32IpAddress})`
              : connectionStatus === 'connecting'
              ? 'ESP32 Connecting...'
              : 'ESP32 Disconnected'}
          </span>
        </div>
        {lastSuccessfulComm && settings.appMode === 'hardware' && (
          <div className="connection-timestamp">
            Last ACK: {formatTime(lastSuccessfulComm)}
          </div>
        )}
      </div>
    </div>
  );
};

export default FanControlPage;
