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
    const interval = setInterval(fetchNotifications, 10000); // Polling every 10s for new in-app alerts
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
          <div className="flex items-center space-x-3">
            {/* Quick Demo Switcher Chips */}
            <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl text-xs space-x-1 border border-slate-200">
              <span className="px-2 py-0.5 text-slate-500 font-semibold flex items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Demo:</span>
              </span>
              <button
                onClick={() => quickLogin('ORGANIZER')}
                className={`px-2 py-1 rounded-lg font-medium transition ${
                  user?.role === 'ORGANIZER'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-purple-50'
                }`}
              >
                Organizer
              </button>
              <button
                onClick={() => quickLogin('CUSTOMER')}
                className={`px-2 py-1 rounded-lg font-medium transition ${
                  user?.email === 'customer@ticketflow.com'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-indigo-50'
                }`}
              >
                Customer 1
              </button>
              <button
                onClick={() => quickLogin('CUSTOMER_2')}
                className={`px-2 py-1 rounded-lg font-medium transition ${
                  user?.email === 'customer2@ticketflow.com'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-emerald-50'
                }`}
              >
                Customer 2
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
