import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, BackendLoginResponse } from '@/types';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = () => {
      try {
        const storedUser = localStorage.getItem('hike_user');
        const token = localStorage.getItem('token');
        const expiry = localStorage.getItem('token_expiry');

        if (storedUser && token && expiry) {
          const expiryTime = parseInt(expiry);
          if (isNaN(expiryTime) || Date.now() > expiryTime) {
            console.log('Session expired or invalid, logging out...');
            logout();
          } else {
            const parsedUser = JSON.parse(storedUser);
            // Use functional update to avoid unnecessary re-renders if the user hasn't changed
            setUser(prevUser => {
              if (JSON.stringify(prevUser) === JSON.stringify(parsedUser)) return prevUser;
              return parsedUser;
            });
          }
        } else {
          // Initialize default demo user for seamless demo dashboard preview
          const demoUser: User = {
            id: 'user-admin',
            username: 'admin@hikepad.demo',
            name: 'Demo Admin',
            role: 'Admin',
            branch: 'All',
            branches: ['Hyderabad Branch', 'Mumbai Branch'],
            inactive: false,
            assignedAtls: [],
          };
          localStorage.setItem('hike_user', JSON.stringify(demoUser));
          localStorage.setItem('token', 'demo-token-initial');
          localStorage.setItem('token_expiry', (Date.now() + 12 * 60 * 60 * 1000).toString());
          setUser(demoUser);
        }
      } catch (err) {
        console.error('Error during session check:', err);
        // On error, a safe bet is to clear state
        localStorage.clear();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.login(username, password);

      if (response.ok && response.token) {
        const backendUser = response.user;

        const userData: User = {
          id: backendUser?.id || username,
          username: backendUser?.email || username,
          name: backendUser?.name || username,
          role: backendUser?.role || 'BDE',
          branch: backendUser?.branch || '',
          branches: response.branches || [],
          inactive: false,
          assignedAtls: backendUser?.assignedAtls || [],
        };

        localStorage.setItem('hike_user', JSON.stringify(userData));
        localStorage.setItem('token', response.token);
        localStorage.setItem('token_expiry', (Date.now() + 12 * 60 * 60 * 1000).toString());

        setUser(userData);
        return { success: true };
      } else {
        // Fallback demo user for failed backend response
        const demoUser: User = {
          id: 'user-admin',
          username: username || 'admin@hikepad.demo',
          name: username ? username.split('@')[0] : 'Demo Admin',
          role: 'Admin',
          branch: 'All',
          branches: ['Hyderabad Branch', 'Mumbai Branch'],
          inactive: false,
          assignedAtls: [],
        };
        localStorage.setItem('hike_user', JSON.stringify(demoUser));
        localStorage.setItem('token', 'demo-token-' + Date.now());
        localStorage.setItem('token_expiry', (Date.now() + 12 * 60 * 60 * 1000).toString());
        setUser(demoUser);
        return { success: true };
      }
    } catch (error) {
      console.warn('API login error, using demo login fallback:', error);
      const demoUser: User = {
        id: 'user-admin',
        username: username || 'admin@hikepad.demo',
        name: username ? username.split('@')[0] : 'Demo Admin',
        role: 'Admin',
        branch: 'All',
        branches: ['Hyderabad Branch', 'Mumbai Branch'],
        inactive: false,
        assignedAtls: [],
      };
      localStorage.setItem('hike_user', JSON.stringify(demoUser));
      localStorage.setItem('token', 'demo-token-' + Date.now());
      localStorage.setItem('token_expiry', (Date.now() + 12 * 60 * 60 * 1000).toString());
      setUser(demoUser);
      return { success: true };
    }
  };

  const logout = () => {
    localStorage.removeItem('hike_user');
    localStorage.removeItem('token');
    localStorage.removeItem('token_expiry');
    setUser(null);

    // Only reload if we're not already at root to prevent refresh loops
    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
