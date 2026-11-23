import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AppNotification } from '../types';
import { NotificationModal } from './NotificationModal';
import { AuthModal } from './AuthModal';
import {
  Ticket,
  Bell,
  Calendar,
  Layers,
  LogOut,
  User,
  Shield,
  Zap,
  Loader2,
  AlertTriangle,
  Settings,
  Check,
} from 'lucide-react';

interface NavbarProps {
  currentView: 'browse' | 'event-details' | 'my-bookings' | 'organizer';
  onNavigate: (view: 'browse' | 'my-bookings' | 'organizer') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout, quickLogin } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<'ORGANIZER' | 'CUSTOMER' | 'CUSTOMER_2' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(api.getBaseUrl());
  const [savedUrlSuccess, setSavedUrlSuccess] = useState(false);

  const isHttpsWithLocalhostBackend =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    api.getBaseUrl().startsWith('http://localhost');

  const handleQuickLogin = async (demoRole: 'ORGANIZER' | 'CUSTOMER' | 'CUSTOMER_2') => {
    setSwitchingRole(demoRole);
    setAuthError(null);
    try {
      await quickLogin(demoRole);
      if (demoRole === 'ORGANIZER') {
        onNavigate('organizer');
      } else if (currentView === 'organizer') {
        onNavigate('browse');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Demo login failed. Please check backend connection.');
    } finally {
      setSwitchingRole(null);
    }
  };

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Ignore background errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (!user) return;
    const interval = setInterval(fetchNotifications, 15000); // Polling every 15s for new in-app alerts
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifications();
    } catch {
      // Ignore
    }
  };

  return (
    <>
      {/* Top Warning Banner if on HTTPS with Localhost API */}
      {isHttpsWithLocalhostBackend && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Production Notice: Frontend is loaded over HTTPS, but API is pointing to &quot;{api.getBaseUrl()}&quot;. Browser security blocks localhost requests from HTTPS.
            </span>
          </div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-2.5 py-1 bg-slate-950 text-white rounded-lg hover:bg-slate-800 transition text-[11px] font-bold shrink-0 ml-2"
          >
            Configure API URL
          </button>
        </div>
      )}

      {/* Auth Error Notification Banner */}
      {authError && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2.5 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium">{authError}</span>
          </div>
          <div className="flex items-center space-x-3 shrink-0 ml-3">
            <button
              onClick={() => setIsConfigOpen(true)}
              className="text-red-700 underline font-semibold hover:text-red-900"
            >
              Configure API URL
            </button>
            <button
              onClick={() => setAuthError(null)}
              className="text-red-400 hover:text-red-600 font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <div
              onClick={() => onNavigate('browse')}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
                <Ticket className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Ticket<span className="text-indigo-600">Flow</span>
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => onNavigate('browse')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                  currentView === 'browse' || currentView === 'event-details'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Explore Events</span>
              </button>

              {user && (
                <button
                  onClick={() => onNavigate('my-bookings')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                    currentView === 'my-bookings'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>My Bookings</span>
                </button>
              )}

              {user && user.role === 'ORGANIZER' && (
                <button
                  onClick={() => onNavigate('organizer')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                    currentView === 'organizer'
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Organizer Studio</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Area: Demo switcher, Notifications, Auth */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Demo Switcher Chips */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs space-x-1 border border-slate-200">
              <span className="hidden sm:flex px-1.5 py-0.5 text-slate-500 font-semibold items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Demo:</span>
              </span>
              <button
                disabled={switchingRole !== null}
                onClick={() => handleQuickLogin('ORGANIZER')}
                className={`px-2 py-1 rounded-lg font-medium transition flex items-center space-x-1 disabled:opacity-50 ${
                  user?.role === 'ORGANIZER'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-purple-50'
                }`}
              >
                {switchingRole === 'ORGANIZER' && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Organizer</span>
              </button>
              <button
                disabled={switchingRole !== null}
                onClick={() => handleQuickLogin('CUSTOMER')}
                className={`px-2 py-1 rounded-lg font-medium transition flex items-center space-x-1 disabled:opacity-50 ${
                  user?.email === 'customer@ticketflow.com'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-indigo-50'
                }`}
              >
                {switchingRole === 'CUSTOMER' && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Customer 1</span>
              </button>
              <button
                disabled={switchingRole !== null}
                onClick={() => handleQuickLogin('CUSTOMER_2')}
                className={`px-2 py-1 rounded-lg font-medium transition flex items-center space-x-1 disabled:opacity-50 ${
                  user?.email === 'customer2@ticketflow.com'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-emerald-50'
                }`}
              >
                {switchingRole === 'CUSTOMER_2' && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Customer 2</span>
              </button>

              <button
                onClick={() => setIsConfigOpen(true)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
                title="Configure Backend API URL"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Notification Bell */}
            {user && (
              <button
                onClick={() => setIsNotifOpen(true)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                title="View Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* User Profile or Sign In */}
            {user ? (
              <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {user.fullName}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      user.role === 'ORGANIZER'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition flex items-center space-x-1.5"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Backend API Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Backend API URL Configuration</h3>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              In production, the frontend connects to your Render backend API. If you haven&apos;t set <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">VITE_API_URL</code> on Vercel yet, you can enter your live Render URL here to connect immediately:
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Render Backend URL</label>
              <input
                type="text"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                placeholder="https://ticketflow-api.onrender.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            {savedUrlSuccess && (
              <div className="p-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center space-x-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>API URL saved! Reloading application...</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  api.clearBaseUrlOverride();
                  setApiUrlInput(api.getBaseUrl());
                  window.location.reload();
                }}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Reset to Default
              </button>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    api.setBaseUrl(apiUrlInput);
                    setSavedUrlSuccess(true);
                    setTimeout(() => {
                      window.location.reload();
                    }, 500);
                  }}
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Drawer Modal */}
      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Authentication Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
};
