import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { Role } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, quickLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('CUSTOMER');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, fullName, role);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoRole: 'ORGANIZER' | 'CUSTOMER' | 'CUSTOMER_2') => {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(demoRole);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              TF
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {isRegister ? 'Create an Account' : 'Sign in to TicketFlow'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Quick Demo Login bar */}
        <div className="mt-4 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-900 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Fast Evaluator Demo Login:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('ORGANIZER')}
              className="px-2.5 py-1.5 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 text-xs font-medium rounded-lg shadow-sm transition"
            >
              Organizer
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('CUSTOMER')}
              className="px-2.5 py-1.5 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 text-xs font-medium rounded-lg shadow-sm transition"
            >
              Customer 1
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('CUSTOMER_2')}
              className="px-2.5 py-1.5 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 text-xs font-medium rounded-lg shadow-sm transition"
            >
              Customer 2
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('CUSTOMER')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition ${
                      role === 'CUSTOMER'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Customer (Book Tickets)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('ORGANIZER')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition ${
                      role === 'ORGANIZER'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Organizer (Create Events)
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@ticketflow.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{loading ? 'Please wait...' : isRegister ? 'Register Account' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {isRegister
              ? 'Already have an account? Sign In'
              : "Don't have an account? Register as Customer or Organizer"}
          </button>
        </div>
      </div>
    </div>
  );
};
