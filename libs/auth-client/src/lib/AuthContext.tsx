/**
 * Authentication Context
 * Provides authentication state and methods to React components
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  userId: number;
  slackUserId: string;
  email: string;
  name?: string;
  teamId: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (redirectTo?: string) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
}

export function AuthProvider({ children, apiBaseUrl = '' }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user on mount
  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/auth/me`, {
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        // Not authenticated - this is expected, not an error
        setUser(null);
      } else {
        // Other errors (500, etc)
        console.error('Failed to fetch user:', response.status);
        setError(`Failed to fetch user: ${response.status}`);
        setUser(null);
      }
    } catch (err) {
      // Network errors, etc
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [apiBaseUrl]);

  const login = (redirectTo?: string) => {
    const currentPath = redirectTo || window.location.pathname;
    window.location.href = `${apiBaseUrl}/auth/slack?redirect=${encodeURIComponent(currentPath)}`;
  };

  const logout = async () => {
    try {
      setError(null);
      const response = await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setUser(null);
        // Optionally redirect to home or login page
      } else {
        throw new Error('Logout failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  const refreshAuth = async () => {
    await fetchUser();
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
