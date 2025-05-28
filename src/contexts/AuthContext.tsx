
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User } from '@/lib/types';
import * as authService from '@/lib/authService'; 
import { jwtDecode, type JwtPayload } from 'jwt-decode';

interface DecodedToken extends JwtPayload {
  userId: string;
  email: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void; // Added to allow token updates from profile
  isLoading: boolean;
  loginUser: (email: string, password?: string) => Promise<void>;
  signupUser: (name?: string, username?: string, email?: string, password?: string) => Promise<void>;
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFromToken = useCallback((currentToken?: string | null) => {
    const tokenToProcess = currentToken !== undefined ? currentToken : authService.getToken();

    if (tokenToProcess) {
      try {
        const decoded = jwtDecode<DecodedToken>(tokenToProcess);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          authService.removeToken();
          setTokenState(null);
          setCurrentUserState(null);
        } else {
          setTokenState(tokenToProcess);
          setCurrentUserState({
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
            username: decoded.username,
            avatarUrl: decoded.avatarUrl,
          });
        }
      } catch (error) {
        console.error("Failed to decode token:", error);
        authService.removeToken();
        setTokenState(null);
        setCurrentUserState(null);
      }
    } else {
      // No token, ensure user is null
      setTokenState(null);
      setCurrentUserState(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUserFromToken();
    // Optional: Add event listener for storage changes if token might be updated/cleared in other tabs
    // window.addEventListener('storage', handleStorageChange);
    // return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadUserFromToken]);

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
  };
  
  const setToken = (newToken: string | null) => {
    if (newToken) {
        authService.setToken(newToken); // Persist to localStorage via authService
        loadUserFromToken(newToken); // Reload user details from the new token
    } else {
        authService.removeToken();
        loadUserFromToken(null); // Clear user
    }
  };


  const loginUserWithContext = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const { token: newToken, user } = await authService.loginUser(email, password);
      setTokenState(newToken); // Set local state
      setCurrentUserState(user);
      // authService.setToken(newToken) is called within authService.loginUser
    } catch (error) {
      throw error; 
    } finally {
      setIsLoading(false);
    }
  };

  const signupUserWithContext = async (name?: string, username?: string, email?: string, password?: string) => {
    setIsLoading(true);
    try {
      const { token: newToken, user } = await authService.signupUser(name, username, email, password);
      setTokenState(newToken); // Set local state
      setCurrentUserState(user);
      // authService.setToken(newToken) is called within authService.signupUser
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUserWithContext = () => {
    authService.removeToken();
    setTokenState(null);
    setCurrentUserState(null);
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, 
        setCurrentUser, 
        token, 
        setToken, // Expose setToken
        isLoading, 
        loginUser: loginUserWithContext, 
        signupUser: signupUserWithContext, 
        logoutUser: logoutUserWithContext 
    }}>
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
