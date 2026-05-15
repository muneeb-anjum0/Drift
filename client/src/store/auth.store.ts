import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { TOKEN_KEY, USER_KEY } from '../utils/constants';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(readStoredUser());
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const persistAuth = (nextToken: string, nextUser: User) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  const bootstrap = async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }

    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      setToken(localStorage.getItem(TOKEN_KEY));
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void bootstrap();
  }, []);

  const login = async (payload: { email: string; password: string }) => {
    const result = await authApi.login(payload);
    persistAuth(result.token, result.user);
  };

  const register = async (payload: { name: string; email: string; password: string }) => {
    const result = await authApi.register(payload);
    persistAuth(result.token, result.user);
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
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  };

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        token,
        loading,
        isAuthenticated: Boolean(token),
        login,
        register,
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
