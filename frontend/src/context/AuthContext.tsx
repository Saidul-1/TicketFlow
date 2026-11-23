import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: Role) => Promise<void>;
  quickLogin: (demoRole: 'ORGANIZER' | 'CUSTOMER' | 'CUSTOMER_2') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    sessionStorage.getItem('tf_token') || localStorage.getItem('tf_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = sessionStorage.getItem('tf_token') || localStorage.getItem('tf_token');
      if (storedToken) {
        // Pin token in this tab's sessionStorage for strict tab isolation
        sessionStorage.setItem('tf_token', storedToken);
        try {
          const profile = await api.getMe();
          setUser(profile);
          setToken(storedToken);
        } catch {
          // Token expired or invalid
          sessionStorage.removeItem('tf_token');
          localStorage.removeItem('tf_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    sessionStorage.setItem('tf_token', res.accessToken);
    localStorage.setItem('tf_token', res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (email: string, password: string, fullName: string, role: Role) => {
    const res = await api.register(email, password, fullName, role);
    sessionStorage.setItem('tf_token', res.accessToken);
    localStorage.setItem('tf_token', res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
  };

  const quickLogin = async (demoRole: 'ORGANIZER' | 'CUSTOMER' | 'CUSTOMER_2') => {
    const credentials = {
      ORGANIZER: { email: 'organizer@ticketflow.com', password: 'Password123!' },
      CUSTOMER: { email: 'customer@ticketflow.com', password: 'Password123!' },
      CUSTOMER_2: { email: 'customer2@ticketflow.com', password: 'Password123!' },
    }[demoRole];

    await login(credentials.email, credentials.password);
  };

  const logout = () => {
    sessionStorage.removeItem('tf_token');
    localStorage.removeItem('tf_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        quickLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
