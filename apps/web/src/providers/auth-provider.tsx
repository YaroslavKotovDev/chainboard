'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { RoleName } from '@chainboard/types';
import { apiClient } from '@/lib/api-client';

export interface AuthUser {
  id: string;
  address: string;
  role: RoleName;
  displayName: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Token stored in memory ref — never persisted to localStorage for XSS safety
  const tokenRef = useRef<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt to restore session on mount using the stored token
  useEffect(() => {
    const storedToken = sessionStorage.getItem('cb_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    tokenRef.current = storedToken;

    apiClient
      .get<AuthUser>('/auth/session', storedToken)
      .then((sessionUser) => {
        setUser(sessionUser);
      })
      .catch(() => {
        tokenRef.current = null;
        sessionStorage.removeItem('cb_token');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback((accessToken: string, authUser: AuthUser) => {
    tokenRef.current = accessToken;
    // sessionStorage is tab-scoped and cleared on browser close — acceptable for this use case
    sessionStorage.setItem('cb_token', accessToken);
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    const token = tokenRef.current;
    if (token) {
      try {
        await apiClient.post('/auth/logout', {}, token);
      } catch {
        // Ignore logout errors — clear client state regardless
      }
    }
    tokenRef.current = null;
    sessionStorage.removeItem('cb_token');
    setUser(null);
  }, []);

  const getToken = useCallback(() => tokenRef.current, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
