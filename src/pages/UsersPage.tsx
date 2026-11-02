import React, { useState } from 'react';
import {
  UserPlus,
  Edit2,
  Trash2,
  ChevronDown,
  UserCheck,
  UserMinus,
  BarChart,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { getUserPreferenceSummary } from '../services/preferenceLearning';
import { formatTime } from '../utils';
import type { UserProfile } from '../types';
import './UsersPage.css';

// Preset icon avatars
const EMOJI_OPTIONS = [
  '👤', '👩', '👨', '👧', '👦', '🧑‍💻',
  '🧔', '👵', '🧒', '🦸‍♂️', '🧑‍🎓', '🧑‍🔧',
  '👓', '🎩', '🚀', '🌟', '🎧', '⚡',
];

const UsersPage: React.FC = () => {
  const users = useAppStore((s) => s.users);
  const occupancy = useAppStore((s) => s.occupancy);
  const preferenceRecords = useAppStore((s) => s.preferenceRecords);
  const sensor = useAppStore((s) => s.sensor);
  const settings = useAppStore((s) => s.settings);

  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const deleteUser = useAppStore((s) => s.deleteUser);
  const toggleUserPresence = useAppStore((s) => s.toggleUserPresence);
  const clearUserPreferences = useAppStore((s) => s.clearUserPreferences);

  // UI state
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserProfile | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('👤');
  const [formError, setFormError] = useState('');

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormIcon('👤');
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (user: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingUser(user);
    setFormName(user.name);
    setFormIcon(user.icon);
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formName.trim().length < 2) {
      setFormError('Please enter a name of at least 2 characters');
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, formName.trim(), formIcon);
    } else {
      addUser(formName.trim(), formIcon);
    }
    setModalOpen(false);
  };

  const handleDeleteUser = () => {
    if (deleteConfirmUser) {
      deleteUser(deleteConfirmUser.id);
      if (expandedUserId === deleteConfirmUser.id) {
        setExpandedUserId(null);
      }
      setDeleteConfirmUser(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedUserId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="page-container users-page">
      {/* Header */}
      <div className="users-header">
        <div>
          <h1>User Profiles</h1>
          <div className="user-count">
            {users.length} registered {users.length === 1 ? 'member' : 'members'} &bull;{' '}
            {occupancy.presentUsers.length} in room
          </div>
        </div>
        <button className="btn-add-user" onClick={handleOpenAddModal}>
          <UserPlus size={18} />
          <span>Add User</span>
        </button>
      </div>

      {/* Empty State */}
      {users.length === 0 && (
        <div className="users-empty-state">
          <div className="empty-icon">👥</div>
          <h2>No Profiles Created</h2>
          <p>
            Create user profiles so AeroPersona can automatically learn individual fan
            speed preferences based on ambient temperature and humidity!
          </p>
          <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ marginTop: '16px' }}>
            <UserPlus size={16} /> Create First Profile
          </button>
        </div>
      )}

      {/* Users Grid */}
      <div className="users-grid">
        {users.map((user) => {
          const isPresent = occupancy.presentUsers.includes(user.id);
          const isExpanded = expandedUserId === user.id;

          const summary = getUserPreferenceSummary(
            user.id,
            preferenceRecords,
            sensor.temperatureC,
            sensor.humidityPct,
            settings.minLearningRecords
          );

          const userRecords = preferenceRecords
            .filter((r) => r.userId === user.id)
            .sort((a, b) => a.timestamp - b.timestamp);

          const chartData = userRecords.map((r) => ({
            time: formatTime(r.timestamp),
            speed: r.speedPercent,
            temp: r.temperatureC,
          }));

          return (
            <div
              key={user.id}
              className={`user-card ${isExpanded ? 'expanded' : ''}`}
              style={{ borderLeftColor: user.color, borderLeftWidth: '4px' }}
            >
              {/* Card Header */}
              <div className="user-card-header" onClick={() => toggleExpand(user.id)}>
                <div className="user-card-icon">{user.icon}</div>
                <div className="user-card-info">
                  <h3>{user.name}</h3>
                  <div className="user-card-meta">
                    <span className={`presence-dot ${isPresent ? 'present' : ''}`} />
                    <span>{isPresent ? 'In Room' : 'Away'}</span>
                    <span>&bull;</span>
                    <span className={`learning-badge ${summary.learningStatus}`}>
                      {summary.learningStatus === 'insufficient_data'
                        ? 'Insufficient Data'
                        : summary.learningStatus === 'learning'
                        ? 'Learning...'
                        : 'Profile Stable'}
                    </span>
                    {user.id.startsWith('user-alpzet') && (
                      <>
                        <span>&bull;</span>
                        <span style={{ fontSize: '0.6875rem', opacity: 0.7, color: 'var(--text-tertiary)' }}>
                          Seeded Demo
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="user-card-actions">
                  <button
                    className="btn-icon"
                    onClick={(e) => handleOpenEditModal(user, e)}
                    title="Edit User Profile"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmUser(user);
                    }}
                    title="Delete User"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronDown
                    size={20}
                    className={`expand-chevron ${isExpanded ? 'expanded' : ''}`}
                  />
                </div>
              </div>

              {/* Expandable Detail Panel */}
              {isExpanded && (
                <div className="user-detail-panel open">
                  <div className="user-detail-content">
                    {/* Stats */}
                    <div className="detail-stats">
                      <div className="stat-block">
                        <div className="stat-value">{summary.totalSamples}</div>
                        <div className="stat-label">Preference Records</div>
                      </div>

                      <div className="stat-block">
                        <div className="stat-value">
                          {summary.estimatedSpeedAtCurrentConditions !== null
                            ? `${summary.estimatedSpeedAtCurrentConditions}%`
                            : `${settings.defaultFanSpeed}% (def)`}
                        </div>
                        <div className="stat-label">
                          Est. Speed @ {sensor.temperatureC.toFixed(1)}°C
                        </div>
                      </div>

                      <div className="stat-block">
                        <div className="stat-value" style={{ textTransform: 'capitalize' }}>
                          {summary.learningStatus.replace('_', ' ')}
                        </div>
                        <div className="stat-label">Model Maturity</div>
                      </div>
                    </div>

                    {/* Chart Container */}
                    <div className="detail-chart-container">
                      <h4>
                        <BarChart size={16} /> Learned Speed Preferences
                      </h4>
                      {chartData.length > 0 ? (
                        <div style={{ width: '100%', height: 160 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                              <XAxis dataKey="time" stroke="var(--text-tertiary)" fontSize={11} />
                              <YAxis domain={[0, 100]} stroke="var(--text-tertiary)" fontSize={11} />
                              <Tooltip
                                contentStyle={{
                                  background: 'var(--bg-secondary)',
                                  border: '1px solid var(--border-primary)',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="speed"
                                name="Speed %"
                                stroke={user.color || '#3B82F6'}
                                strokeWidth={2.5}
                                dot={{ r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', padding: '12px 0' }}>
                          No recorded preference samples yet. When this user is present and changes the fan speed in Fan Control, AeroPersona records their environmental preference.
                        </p>
                      )}
                    </div>

                    {/* Presence simulation toggle in Demo Mode & Management Actions */}
                    <div className="detail-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => toggleUserPresence(user.id)}
                      >
                        {isPresent ? <UserMinus size={16} /> : <UserCheck size={16} />}
                        <span>{isPresent ? 'Simulate User Leaving' : 'Simulate User Entering'}</span>
                      </button>

                      {userRecords.length > 0 && (
                        <button
                          className="btn-danger-outline"
                          onClick={() => clearUserPreferences(user.id)}
                        >
                          Clear Learning Data
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Edit User Profile' : 'Add New Member'}</h2>

            <form onSubmit={handleSaveUser}>
              <div className="form-group">
                <label>User Name</label>
                <input
                  type="text"
                  className={`form-input ${formError ? 'error' : ''}`}
                  placeholder="e.g. Alice, Bob, Dad..."
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  autoFocus
                />
                {formError && <div className="form-error">{formError}</div>}
              </div>

              <div className="form-group">
                <label className="emoji-picker-label">Select Avatar Icon</label>
                <div className="emoji-picker-grid">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      className={`emoji-btn ${formIcon === emoji ? 'selected' : ''}`}
                      onClick={() => setFormIcon(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmUser(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Profile</h2>
            <p>
              Are you sure you want to delete{' '}
              <strong className="confirm-name">{deleteConfirmUser.name}</strong>? All
              learned speed preferences and historical samples will be permanently deleted.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setDeleteConfirmUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteUser}
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
