import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User } from '../types';
import axios from 'axios';

interface AuthContextType {
  user: User;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>({
    username: '',
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    if (user.isAuthenticated && user.username) {
      try {
        const response = await axios.get(`http://localhost:5000/api/user/profile?username=${user.username}`);
        const profile = response.data;
        setUser(prev => ({
          ...prev,
          name: profile.name || prev.username,
          profilePhoto: profile.profile_photo ? `http://localhost:5000${profile.profile_photo}` : undefined,
        }));
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      }
    }
  }, [user.isAuthenticated, user.username]);

  useEffect(() => {
    if (user.isAuthenticated && user.username) {
      refreshUser();
    }
  }, [user.isAuthenticated, user.username, refreshUser]);

  const login = async (username: string, password: string): Promise<boolean> => {
    // For now, hardcoded admin/admin credentials
    if (username === 'admin' && password === 'admin') {
      const newUser: User = {
        username: 'admin',
        name: 'Admin',
        isAuthenticated: true,
      };
      setUser(newUser);
      // Fetch profile after login
      setTimeout(() => refreshUser(), 100);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser({
      username: '',
      isAuthenticated: false,
    });
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};