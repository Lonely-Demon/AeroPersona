import React, { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Thermometer,
  Droplets,
  Fan,
  Users,
  Brain,
  Zap,
  Info,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getUserPreferenceSummary } from '../services/preferenceLearning';
import { formatTime, formatDateTime, calcStats } from '../utils';
import './AnalyticsPage.css';

type TabKey = 'temp' | 'humidity' | 'speed' | 'occupancy' | 'preferences' | 'automation';

const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('temp');

  const sensor = useAppStore((s) => s.sensor);
  const fan = useAppStore((s) => s.fan);
  const occupancy = useAppStore((s) => s.occupancy);
  const users = useAppStore((s) => s.users);
  const preferenceRecords = useAppStore((s) => s.preferenceRecords);
  const automationEvents = useAppStore((s) => s.automationEvents);
  const settings = useAppStore((s) => s.settings);

  const temperatureHistory = useAppStore((s) => s.temperatureHistory);
  const humidityHistory = useAppStore((s) => s.humidityHistory);
  const speedHistory = useAppStore((s) => s.speedHistory);
  const occupancyHistory = useAppStore((s) => s.occupancyHistory);

  // Compute summary stats
  const tempStats = calcStats(temperatureHistory.map((p) => p.value));
  const humStats = calcStats(humidityHistory.map((p) => p.value));
  const speedStats = calcStats(speedHistory.map((p) => p.value));
  const occStats = calcStats(occupancyHistory.map((p) => p.value));

  // Format histories for charts
  const tempChartData = temperatureHistory.map((p) => ({
    time: formatTime(p.timestamp),
    temp: p.value,
  }));

  const humChartData = humidityHistory.map((p) => ({
    time: formatTime(p.timestamp),
    humidity: p.value,
  }));

  const speedChartData = speedHistory.map((p) => ({
    time: formatTime(p.timestamp),
    speed: p.value,
  }));

  const occChartData = occupancyHistory.map((p) => ({
    time: formatTime(p.timestamp),
    occupancy: p.value,
  }));

  return (
    <div className="page-container analytics-page">
      <h1>System Analytics</h1>
      <div className="page-subtitle">Historical trends, user models & telemetry telemetry</div>

      {/* Tabs */}
      <div className="analytics-tabs">
        <button
          className={`tab-button ${activeTab === 'temp' ? 'active' : ''}`}
          onClick={() => setActiveTab('temp')}
        >
          <Thermometer size={16} /> Temperature
        </button>
        <button
          className={`tab-button ${activeTab === 'humidity' ? 'active' : ''}`}
          onClick={() => setActiveTab('humidity')}
        >
          <Droplets size={16} /> Humidity
        </button>
        <button
          className={`tab-button ${activeTab === 'speed' ? 'active' : ''}`}
          onClick={() => setActiveTab('speed')}
        >
          <Fan size={16} /> Fan Speed
        </button>
        <button
          className={`tab-button ${activeTab === 'occupancy' ? 'active' : ''}`}
          onClick={() => setActiveTab('occupancy')}
        >
          <Users size={16} /> Occupancy
        </button>
        <button
          className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Brain size={16} /> Preferences
        </button>
        <button
          className={`tab-button ${activeTab === 'automation' ? 'active' : ''}`}
          onClick={() => setActiveTab('automation')}
        >
          <Zap size={16} /> Automation
        </button>
      </div>

      {/* Tab: Temperature */}
      {activeTab === 'temp' && (
        <div className="chart-card">
          <h2>Temperature Monitoring History</h2>
          <div className="current-value-display">
            <span className="big-value">{sensor.temperatureC.toFixed(1)}°C</span>
            <span className="big-label">Current Ambient Reading (DHT11)</span>
          </div>

          <div className="stat-badges">
            <div className="stat-badge">
              <span className="stat-label">Minimum</span>
              <span className="stat-value">{tempStats.min || sensor.temperatureC}°C</span>
            </div>
            <div className="stat-badge">
              <span className="stat-label">Average</span>
              <span className="stat-value accent">{tempStats.avg || sensor.temperatureC}°C</span>
            </div>
            <div className="stat-badge">
              <span className="stat-label">Maximum</span>
              <span className="stat-value red">{tempStats.max || sensor.temperatureC}°C</span>
            </div>
          </div>

          <div className="chart-container">
            {tempChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={tempChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="time" stroke="var(--text-tertiary)" fontSize={11} />
                  <YAxis domain={['auto', 'auto']} stroke="var(--text-tertiary)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    name="Temp (°C)"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>Collecting temperature telemetry points...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Humidity */}
      {activeTab === 'humidity' && (
        <div className="chart-card">
          <h2>Relative Humidity History</h2>
          <div className="current-value-display">
            <span className="big-value">{Math.round(sensor.humidityPct)}%</span>
            <span className="big-label">Current Ambient Relative Humidity</span>
          </div>

          <div className="stat-badges">
            <div className="stat-badge">
              <span className="stat-label">Minimum</span>
              <span className="stat-value">{humStats.min || sensor.humidityPct}%</span>
            </div>
            <div className="stat-badge">
              <span className="stat-label">Average</span>
              <span className="stat-value accent">{humStats.avg || sensor.humidityPct}%</span>
            </div>
            <div className="stat-badge">
              <span className="stat-label">Maximum</span>
              <span className="stat-value">{humStats.max || sensor.humidityPct}%</span>
            </div>
          </div>

          <div className="chart-container">
            {humChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={humChartData}>
                  <defs>
                    <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="time" stroke="var(--text-tertiary)" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="var(--text-tertiary)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity (%)"
                    stroke="#3B82F6"
                    fill="url(#humGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>Collecting humidity data points...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Fan Speed */}
      {activeTab === 'speed' && (
        <div className="chart-card">
          <h2>Fan Speed Timeline</h2>
          <div className="current-value-display">
            <span className="big-value">{fan.isOn ? `${fan.speedPercent}%` : '0%'}</span>
            <span className="big-label">Current Requested PWM Speed</span>
          </div>

          <div className="stat-badges">
            <div className="stat-badge">
              <span className="stat-label">Current</span>
              <span className="stat-value accent">{fan.isOn ? fan.speedPercent : 0}%</span>
            </div>
            <div className="stat-badge">
              <span className="stat-label">Average</span>
              <span className="stat-value">{speedStats.avg}%</span>
            </div>
            <div className="stat-badge">
              <span className="stat-label">Peak</span>
              <span className="stat-value green">{speedStats.max}%</span>
            </div>
          </div>

          <div className="chart-container">
            {speedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={speedChartData}>
                  <defs>
                    <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="time" stroke="var(--text-tertiary)" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="var(--text-tertiary)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="speed"
                    name="Speed (%)"
                    stroke="#10B981"
                    fill="url(#speedGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>Collecting speed data points...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Occupancy */}
      {activeTab === 'occupancy' && (
        <div className="chart-card">
          <h2>Room Occupancy Profile</h2>
          <div className="current-value-display">
            <span className="big-value">{occupancy.presentUsers.length}</span>
            <span className="big-label">Registered Users Currently Detected</span>
          </div>

          <div className="stat-badges">
            <div className="stat-badge">
              <span className="stat-label">PIR Sensor</span>
              <span className="stat-value green">
                {occupancy.pirDetected ? 'Active Motion' : 'No Motion'}
              </span>
            </div>
            <div className="stat-badge">
              <span className="stat-label">Avg Occupancy</span>
              <span className="stat-value">{occStats.avg} users</span>
            </div>
          </div>

          <div className="chart-container">
            {occChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={occChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="time" stroke="var(--text-tertiary)" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="var(--text-tertiary)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="occupancy"
                    name="Users Present"
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>Collecting occupancy telemetry...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: User Preferences Learning Models */}
      {activeTab === 'preferences' && (
        <div className="chart-card">
          <h2>User Preference Models</h2>
          <div className="page-subtitle" style={{ marginBottom: '16px' }}>
            Multi-user correlation between environmental temperature and selected fan speed
          </div>

          {users.length > 0 ? (
            users.map((user) => {
              const summary = getUserPreferenceSummary(
                user.id,
                preferenceRecords,
                sensor.temperatureC,
                sensor.humidityPct,
                settings.minLearningRecords
              );

              const userRecords = preferenceRecords.filter((r) => r.userId === user.id);
              const scatterData = userRecords.map((r) => ({
                temperature: r.temperatureC,
                speed: r.speedPercent,
                humidity: r.humidityPct,
              }));

              return (
                <div key={user.id} className="user-pref-section">
                  <div className="user-pref-header">
                    <span className="user-icon">{user.icon}</span>
                    <span className="user-name">{user.name}</span>
                    <span
                      className={`learning-badge ${
                        summary.learningStatus === 'insufficient_data'
                          ? 'insufficient'
                          : summary.learningStatus
                      }`}
                    >
                      {summary.learningStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="user-pref-stats">
                    <div className="mini-stat">
                      <span>Total Data Points:</span>
                      <strong>{summary.totalSamples}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Estimated Speed at {sensor.temperatureC.toFixed(1)}°C:</span>
                      <strong>
                        {summary.estimatedSpeedAtCurrentConditions !== null
                          ? `${summary.estimatedSpeedAtCurrentConditions}%`
                          : 'Fallback Default'}
                      </strong>
                    </div>
                  </div>

                  <div className="user-scatter-chart">
                    {scatterData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                          <XAxis
                            dataKey="temperature"
                            name="Temp"
                            unit="°C"
                            domain={[15, 45]}
                            stroke="var(--text-tertiary)"
                            fontSize={11}
                          />
                          <YAxis
                            dataKey="speed"
                            name="Speed"
                            unit="%"
                            domain={[0, 100]}
                            stroke="var(--text-tertiary)"
                            fontSize={11}
                          />
                          <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-primary)',
                              borderRadius: '8px',
                            }}
                          />
                          <Scatter
                            name={user.name}
                            data={scatterData}
                            fill={user.color || '#3B82F6'}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-state" style={{ padding: '16px 0' }}>
                        <p style={{ fontSize: '0.8125rem' }}>
                          No recorded preference data yet for this user.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <p>No user profiles created yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Automation Events */}
      {activeTab === 'automation' && (
        <div className="chart-card">
          <h2>Automation Activity Log</h2>
          <div className="page-subtitle" style={{ marginBottom: '16px' }}>
            Total triggers logged: {automationEvents.length}
          </div>

          <div className="automation-event-list">
            {automationEvents.length > 0 ? (
              automationEvents.map((evt) => (
                <div key={evt.id} className="automation-event-item">
                  <div className="event-time">{formatDateTime(evt.timestamp)}</div>
                  <div className="event-trigger">{evt.trigger}</div>
                  <div className="event-action">
                    &bull; {evt.action} ({evt.temperatureC.toFixed(1)}°C, {Math.round(evt.humidityPct)}% RH)
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No automation events recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mandatory Requirement: Energy Consumption Disclaimer */}
      <div className="energy-note">
        <Info size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Energy Monitoring Notice:</strong> Energy consumption values and
          environmental savings are strictly estimated. Actual power measurement
          instrumentation (current/voltage shunt sensor) is not installed on this prototype.
        </span>
      </div>
    </div>
  );
};

export default AnalyticsPage;
