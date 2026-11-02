import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Fan,
  Users,
  Zap,
  BarChart3,
  Settings,
  Wind,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import './BottomNav.css';

// ---- Navigation tab definitions ----
const NAV_TABS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/fan', label: 'Fan', icon: Fan },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/automation', label: 'Auto', icon: Zap },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

/**
 * BottomNav – Fixed top header + bottom tab navigation.
 *
 * The top header shows the AeroPersona brand and live connection status.
 * The bottom bar provides six navigation tabs with active-state highlighting.
 */
const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const appMode = useAppStore((s) => s.settings.appMode);

  // Derive display label for connection indicator
  const statusLabel =
    appMode === 'demo'
      ? 'Demo'
      : connectionStatus === 'connected'
        ? 'Online'
        : connectionStatus === 'connecting'
          ? 'Connecting'
          : 'Offline';

  // Map connection status to the CSS modifier class for the dot
  const dotClass =
    appMode === 'demo'
      ? 'online' // demo mode shows green
      : connectionStatus === 'connected'
        ? 'online'
        : connectionStatus === 'connecting'
          ? 'connecting'
          : 'offline';

  return (
    <>
      {/* ---- Top Header Bar ---- */}
      <header className="top-header">
        <div className="top-header-brand">
          <div className="top-header-logo">
            <Wind size={16} />
          </div>
          <span className="top-header-name">AeroPersona</span>
        </div>

        <div className="top-header-status">
          <span className={`status-dot ${dotClass}`} />
          {statusLabel}
        </div>
      </header>

      {/* Spacer so page content isn't hidden behind the fixed header */}
      <div className="nav-top-spacer" />

      {/* ---- Bottom Tab Bar ---- */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV_TABS.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;

          return (
            <button
              key={path}
              className={`nav-tab${isActive ? ' active' : ''}`}
              onClick={() => navigate(path)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              type="button"
            >
              <span className="nav-tab-icon">
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span className="nav-tab-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default BottomNav;
