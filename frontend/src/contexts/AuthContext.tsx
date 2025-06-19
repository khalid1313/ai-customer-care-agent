'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getBackendUrl, resetBackendUrlCache } from '@/utils/config';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string; // Computed from firstName + lastName
  role: 'owner' | 'admin' | 'agent' | 'member';
  businessId: string;
  business: {
    id: string;
    name: string;
    plan: 'starter' | 'professional' | 'enterprise';
  };
}

interface AuthContextType {
  user: User | null;
  business: User['business'] | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string, businessName: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    // Reset backend URL cache to force re-discovery
    resetBackendUrlCache();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const backendUrl = await getBackendUrl();
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(`${backendUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const userData = await response.json();
        setUser({
          id: userData.data.user.id,
          email: userData.data.user.email,
          firstName: userData.data.user.firstName,
          lastName: userData.data.user.lastName,
          name: `${userData.data.user.firstName} ${userData.data.user.lastName}`,
          role: userData.data.user.role,
          businessId: userData.data.business.id,
          business: {
            id: userData.data.business.id,
            name: userData.data.business.name,
            plan: userData.data.business.subscription
          }
        });
      } else {
        console.log('Auth check failed with status:', response.status);
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (error.name === 'AbortError') {
        console.error('Auth check timed out');
      }
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const backendUrl = await getBackendUrl();
      console.log('Login attempt:', { email, password: '***', backendUrl });
      
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('Login response data:', data);

      if (response.ok) {
        localStorage.setItem('auth_token', data.data.token);
        setUser({
          id: data.data.user.id,
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          name: `${data.data.user.firstName} ${data.data.user.lastName}`,
          role: data.data.user.role,
          businessId: data.data.business.id,
          business: {
            id: data.data.business.id,
            name: data.data.business.name,
            plan: data.data.business.subscription
          }
        });
        return true;
      } else {
        console.error('Login failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string, businessName: string): Promise<boolean> => {
    try {
      const backendUrl = await getBackendUrl();
      
      // Split name into firstName and lastName
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      console.log('Registration attempt:', { email, firstName, lastName, businessName, backendUrl });
      
      const response = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          firstName,
          lastName,
          businessName
        }),
      });

      console.log('Registration response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('Registration response data:', data);

      if (response.ok) {
        localStorage.setItem('auth_token', data.data.token);
        setUser({
          id: data.data.user.id,
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          name: `${data.data.user.firstName} ${data.data.user.lastName}`,
          role: data.data.user.role,
          businessId: data.data.business.id,
          business: {
            id: data.data.business.id,
            name: data.data.business.name,
            plan: data.data.business.subscription
          }
        });
        return true;
      } else {
        console.error('Registration failed:', data.error);
        if (data.details) {
          console.error('Validation details:', data.details);
        }
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const value: AuthContextType = {
    user,
    business: user?.business || null,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}