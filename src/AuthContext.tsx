import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setMemoryToken, getMemoryToken } from './api';
import { hasPermission as checkPermission } from './permissions';

interface User {
  _id: string;
  name: string;
  email: string;
  role: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const failsafeTimeout = setTimeout(() => setIsLoading(false), 8000);
    try {
      let savedToken = null;
      try {
        savedToken = await AsyncStorage.getItem('token');
      } catch (e) {
        console.warn('AsyncStorage unavailable, using memory store');
        savedToken = getMemoryToken();
      }
      
      if (savedToken) {
        setToken(savedToken);
        const { data } = await api.get('/auth/profile');
        setUser(data);
      }
    } catch (error) {
      console.error("Auth Exception:", error);
      try {
        await AsyncStorage.removeItem('token');
      } catch (e) {}
      setMemoryToken(null);
    } finally {
      clearTimeout(failsafeTimeout);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    try {
      await AsyncStorage.setItem('token', data.token);
    } catch (e) {
      setMemoryToken(data.token);
    }
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
    } catch (e) {}
    setMemoryToken(null);
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string) => checkPermission(user, permission);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated: !!user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
