import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fan,
  Thermometer,
  Droplets,
  Users,
  Power,
  Zap,
  Radio,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatRelativeTime, getTemperatureColor, getHumidityColor } from '../utils';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const fan = useAppStore((s) => s.fan);
  const sensor = useAppStore((s) => s.sensor);
  const occupancy = useAppStore((s) => s.occupancy);
  const relay = useAppStore((s) => s.relay);
  const users = useAppStore((s) => s.users);
  const settings = useAppStore((s) => s.settings);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const systemEvents = useAppStore((s) => s.systemEvents);
  const speedDecision = useAppStore((s) => s.speedDecision);
  const setFanPower = useAppStore((s) => s.setFanPower);

  // Present user profiles
  const presentUsersList = users.filter((u) => occupancy.presentUsers.includes(u.id));

  return (
    <div className="page-container dashboard-page">
      {/* Operating Environment Banner */}
      {settings.appMode === 'demo' ? (
        <div className="dash-banner demo">
          <div className="dash-banner-left">
            <Radio size={16} />
            <span>Demo Mode Active – Simulated Telemetry & Presence</span>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/settings')}
            style={{ color: 'inherit', padding: '2px 8px' }}
          >
            Config
          </button>
        </div>
      ) : (
        <div
          className={`dash-banner ${
            connectionStatus === 'connected'
              ? 'hardware-connected'
              : 'hardware-disconnected'
          }`}
        >
          <div className="dash-banner-left">
            {connectionStatus === 'connected' ? (
              <ShieldCheck size={16} />
            ) : (
              <ShieldAlert size={16} />
            )}
            <span>
              ESP32 Hardware Mode:{' '}
              {connectionStatus === 'connected'
                ? `Connected (${settings.esp32IpAddress})`
                : connectionStatus === 'connecting'
                ? `Connecting to ${settings.esp32IpAddress}...`
                : `Disconnected from ${settings.esp32IpAddress}`}
            </span>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/settings')}
            style={{ color: 'inherit', padding: '2px 8px' }}
          >
            Settings
          </button>
        </div>
      )}

      {/* Main Fan Hero Card */}
      <div className="hero-card">
        <div className="hero-header">
          <div className="hero-title-group">
            <h2>
              <Fan size={20} className={fan.isOn ? 'spinning' : ''} />
              AeroPersona Fan
            </h2>
          </div>
          <button
            className={`btn btn-sm ${fan.isOn ? 'btn-danger' : 'btn-success'}`}
            onClick={() => setFanPower(!fan.isOn)}
            title={fan.isOn ? 'Turn Fan OFF' : 'Turn Fan ON'}
          >
            <Power size={14} />
            {fan.isOn ? 'Turn OFF' : 'Turn ON'}
          </button>
        </div>

        <div className="hero-main">
          <div
            className={`fan-spin-wrapper ${fan.isOn ? 'spinning' : ''}`}
            onClick={() => navigate('/fan')}
            style={{ cursor: 'pointer' }}
            title="Go to Fan Controls"
          >
            <Fan size={52} className="fan-spin-icon" />
          </div>

          <div className="hero-stats">
            <div className="hero-speed-val">
              {fan.isOn ? `${fan.speedPercent}%` : 'OFF'}
            </div>
            <div className="hero-speed-label">
              Requested Fan Speed
              <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                (PWM Control via L298N)
              </span>
            </div>
            <div className="hero-mode-pill">
              Mode: {fan.mode}
            </div>
          </div>
        </div>

        {/* Empty room countdown alert if active */}
        {occupancy.emptyRoomCountdown !== null && (
          <div className="countdown-alert">
            <Clock size={16} />
            <span>
              Empty room detected. Fan shutting down in {occupancy.emptyRoomCountdown}s.
            </span>
          </div>
        )}
      </div>

      {/* Speed Decision Explanation (Personalized/Automatic Mode) */}
      {fan.mode !== 'manual' && speedDecision && (
        <div className="decision-banner">
          <div className="decision-banner-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} /> Multi-User Auto Decision
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              {formatRelativeTime(speedDecision.timestamp)}
            </span>
          </div>
          <div className="decision-message">{speedDecision.message}</div>
          {speedDecision.userSpeeds.length > 0 && (
            <div className="decision-users-breakdown">
              {speedDecision.userSpeeds.map((u) => (
                <span key={u.userId} className="user-chip">
                  👤 {u.userName}: {u.speed}%
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2x2 Telemetry Grid */}
      <div className="dash-grid">
        {/* Temperature Card */}
        <div className="telemetry-card">
          <div className="telemetry-header">
            <span>Temperature</span>
            <div
              className="telemetry-icon-box"
              style={{ color: getTemperatureColor(sensor.temperatureC) }}
            >
              <Thermometer size={18} />
            </div>
          </div>
          <div>
            <div
              className="telemetry-value"
              style={{ color: getTemperatureColor(sensor.temperatureC) }}
            >
              {sensor.temperatureC.toFixed(1)}°C
            </div>
            <div className="telemetry-subtext">DHT11 Ambient Sensor</div>
          </div>
        </div>

        {/* Humidity Card */}
        <div className="telemetry-card">
          <div className="telemetry-header">
            <span>Humidity</span>
            <div
              className="telemetry-icon-box"
              style={{ color: getHumidityColor(sensor.humidityPct) }}
            >
              <Droplets size={18} />
            </div>
          </div>
          <div>
            <div
              className="telemetry-value"
              style={{ color: getHumidityColor(sensor.humidityPct) }}
            >
              {Math.round(sensor.humidityPct)}%
            </div>
            <div className="telemetry-subtext">Relative Humidity</div>
          </div>
        </div>

        {/* Occupancy Card */}
        <div className="telemetry-card">
          <div className="telemetry-header">
            <span>Room Occupancy</span>
            <div
              className="telemetry-icon-box"
              style={{
                color: occupancy.pirDetected ? 'var(--accent-green)' : 'var(--text-tertiary)',
              }}
            >
              <Users size={18} />
            </div>
          </div>
          <div>
            <div
              className="telemetry-value"
              style={{
                color: occupancy.pirDetected ? 'var(--accent-green)' : 'var(--text-tertiary)',
                fontSize: '1.4rem',
              }}
            >
              {occupancy.pirDetected ? 'Occupied' : 'Vacant'}
            </div>
            <div className="telemetry-subtext">
              HC-SR501 PIR Sensor &bull; {occupancy.presentUsers.length} user(s)
            </div>
          </div>
        </div>

        {/* Connected Device Relay Card */}
        <div className="telemetry-card">
          <div className="telemetry-header">
            <span>Aux Connected Device</span>
            <div
              className="telemetry-icon-box"
              style={{
                color: relay.isOn ? 'var(--accent-yellow)' : 'var(--text-tertiary)',
              }}
            >
              <Zap size={18} />
            </div>
          </div>
          <div>
            <div
              className="telemetry-value"
              style={{
                color: relay.isOn ? 'var(--accent-yellow)' : 'var(--text-tertiary)',
                fontSize: '1.4rem',
              }}
            >
              {relay.isOn ? 'ACTIVE' : 'OFF'}
            </div>
            <div className="telemetry-subtext">Single-channel Relay</div>
          </div>
        </div>
      </div>

      {/* Present Users Section */}
      <div className="card-section">
        <div className="card-section-header">
          <div className="card-section-title">
            <Users size={16} /> Registered Users Present ({presentUsersList.length})
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/users')}
            style={{ fontSize: '0.75rem', gap: '2px' }}
          >
            Manage <ChevronRight size={14} />
          </button>
        </div>

        <div className="present-users-list">
          {presentUsersList.length > 0 ? (
            presentUsersList.map((user) => (
              <div
                key={user.id}
                className="present-pill"
                style={{ borderColor: user.color }}
              >
                <span className="present-pill-icon">{user.icon}</span>
                <span>{user.name}</span>
              </div>
            ))
          ) : (
            <div className="empty-present">
              {users.length === 0
                ? 'No users created yet. Head to Users section to add profiles.'
                : 'No registered users currently detected in room.'}
            </div>
          )}
        </div>
      </div>

      {/* Recent System Events */}
      <div className="card-section">
        <div className="card-section-header">
          <div className="card-section-title">
            <Info size={16} /> Recent System Activity
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Real-time Log
          </span>
        </div>

        <div className="events-stream">
          {systemEvents.slice(0, 6).map((evt) => (
            <div key={evt.id} className="event-item">
              <div className={`event-item-dot ${evt.type}`} />
              <div className="event-item-content">
                <div className="event-item-msg">{evt.message}</div>
                <div className="event-item-time">{formatRelativeTime(evt.timestamp)}</div>
              </div>
            </div>
          ))}
          {systemEvents.length === 0 && (
            <div className="empty-present">System ready. No recent events recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
