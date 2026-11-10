import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = () => {
    setUser(null);
    queryClient.clear();
  };

  useEffect(() => {
    // Remove credentials left by the older browser-token login flow.
    localStorage.removeItem('driftledger_token');
    localStorage.removeItem('driftledger_user');
    const bootstrap = async () => {
      try {
        const currentUser = await authApi.me();
        setUser(currentUser);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const authSession = await authApi.login({ email, password });
    setUser(authSession.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const authSession = await authApi.register({ name, email, password });
    setUser(authSession.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
    }
  };

  const refreshUser = async () => {
    const currentUser = await authApi.me();
    setUser(currentUser);
  };

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        signup,
        logout,
        refreshUser,
      },
    },
    children
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
