import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import BottomNav from './components/BottomNav';
import DashboardPage from './pages/DashboardPage';
import FanControlPage from './pages/FanControlPage';
import UsersPage from './pages/UsersPage';
import AutomationPage from './pages/AutomationPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

/**
 * AeroPersona – Root Application Component
 *
 * Manages theme application, periodic history recording,
 * automation checks, and hardware polling lifecycle.
 */
const App: React.FC = () => {
  const theme = useAppStore((s) => s.settings.theme);
  const appMode = useAppStore((s) => s.settings.appMode);
  const pushHistory = useAppStore((s) => s.pushHistory);
  const runAutomationCheck = useAppStore((s) => s.runAutomationCheck);
  const startPolling = useAppStore((s) => s.startPolling);
  const stopPolling = useAppStore((s) => s.stopPolling);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // History recording: push a snapshot every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      pushHistory();
    }, 10000);
    pushHistory(); // initial push
    return () => clearInterval(interval);
  }, [pushHistory]);

  // Automation check: run every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      runAutomationCheck();
    }, 5000);
    return () => clearInterval(interval);
  }, [runAutomationCheck]);

  // Hardware polling lifecycle
  useEffect(() => {
    if (appMode === 'hardware') {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [appMode, startPolling, stopPolling]);

  return (
    <HashRouter>
      <div className="app-shell">
        <BottomNav />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/fan" element={<FanControlPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
