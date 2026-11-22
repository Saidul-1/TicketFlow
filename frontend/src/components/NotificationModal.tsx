import React from 'react';
import { AppNotification } from '../types';
import { X, CheckCircle, AlertTriangle, Bell } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Notifications</h3>
          </div>
          <div className="flex items-center space-x-2">
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No notifications yet. Holds and bookings will generate instant alerts here!
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && onMarkRead(notif.id)}
                className={`p-3 rounded-xl transition cursor-pointer flex items-start space-x-3 ${
                  notif.isRead ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/50 hover:bg-indigo-50'
                }`}
              >
                <div className="mt-0.5">
                  {notif.type === 'BOOKING_CONFIRMED' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${notif.isRead ? 'font-medium text-slate-800' : 'font-semibold text-slate-900'}`}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
