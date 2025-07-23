import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/api/entities';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 PROD DEBUG: AuthProvider initializing...');
    
    // Check for existing user session in localStorage
    const savedUser = localStorage.getItem('mth_user');
    console.log('🔍 PROD DEBUG: Saved user from localStorage:', savedUser ? 'exists' : 'not found');
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('🔍 PROD DEBUG: Parsed user data:', userData);
        
        // Update admin role for specific emails if needed
        const adminEmails = ['rotemiluz53@gmail.com'];
        if (adminEmails.includes(userData.email) && userData.role !== 'admin') {
          console.log('🔍 PROD DEBUG: Updating admin role for:', userData.email);
          userData.role = 'admin';
          userData.is_admin = true;
          localStorage.setItem('mth_user', JSON.stringify(userData));
        }
        
        console.log('🔍 PROD DEBUG: Setting user state:', userData);
        setUser(userData);
      } catch (error) {
        console.error('🔍 PROD DEBUG: Error parsing saved user:', error);
        localStorage.removeItem('mth_user');
      }
    }
    
    console.log('🔍 PROD DEBUG: AuthProvider loading complete, setting loading to false');
    setLoading(false);
  }, []);

  const signIn = async (email, password) => {
    try {
      const isProduction = window.location.hostname !== 'localhost';
      const logPrefix = isProduction ? '🔍 PROD DEBUG:' : '🔍 DEV DEBUG:';
      
      console.log(`${logPrefix} AuthContext signIn called with:`, { 
        email, 
        environment: isProduction ? 'PRODUCTION' : 'DEVELOPMENT',
        hostname: window.location.hostname,
        currentUrl: window.location.href
      });
      
      // Call backend API for authentication
      const response = await User.login(email, password);
      console.log(`${logPrefix} Backend login response:`, response);
      
      // Ensure we have the required response structure
      if (!response || !response.user || !response.access_token) {
        console.error(`${logPrefix} Invalid server response:`, response);
        throw new Error(`Invalid response from server - missing ${!response ? 'response' : !response.user ? 'user' : 'access_token'}`);
      }
      
      // Create user object with token from Flask backend
      // Check for admin role from multiple sources
      const isAdminUser = response.user.is_admin || 
                         response.user.role === 'admin' || 
                         email === 'rotemiluz53@gmail.com';
      
      const userRole = isAdminUser ? 'admin' : (response.user.role || 'user');
      
      const user = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.full_name || email.split('@')[0], // Use full_name from user_profiles
        is_admin: isAdminUser,
        role: userRole,
        access_token: response.access_token,
        createdAt: new Date().toISOString()
      };
      
      console.log(`${logPrefix} Created user object:`, user);
      
      setUser(user);
      localStorage.setItem('mth_user', JSON.stringify(user));
      
      console.log(`${logPrefix} User state updated and saved to localStorage`);
      
      return { success: true, user: user };
    } catch (error) {
      console.error(`${logPrefix} Sign in error:`, {
        message: error.message,
        stack: error.stack,
        environment: isProduction ? 'PRODUCTION' : 'DEVELOPMENT'
      });
      return { success: false, error: error.message || 'Sign in failed' };
    }
  };

  const signUp = async (email, password, name) => {
    try {
      // Call backend API for registration
      const response = await User.register(email, password);
      
      // Create user object
      const user = {
        id: response.user_id,
        email: email,
        name: name || email.split('@')[0],
        is_admin: email.includes('rotemiluz53@gmail.com'),
        role: email.includes('rotemiluz53@gmail.com') ? 'admin' : 'user',
        createdAt: new Date().toISOString()
      };
      
      setUser(user);
      localStorage.setItem('mth_user', JSON.stringify(user));
      return { success: true, user: user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message || 'Sign up failed' };
    }
  };

  const signOut = () => {
    console.log('🔍 PROD DEBUG: signOut called - clearing user state and localStorage');
    setUser(null);
    localStorage.removeItem('mth_user');
  };

  // Debug helper function
  const debugAuthState = () => {
    const savedUser = localStorage.getItem('mth_user');
    console.log('🔍 PROD DEBUG: === AUTH STATE DEBUG ===');
    console.log('🔍 PROD DEBUG: React state user:', user);
    console.log('🔍 PROD DEBUG: Loading state:', loading);
    console.log('🔍 PROD DEBUG: localStorage mth_user:', savedUser);
    console.log('🔍 PROD DEBUG: Current URL:', window.location.href);
    console.log('🔍 PROD DEBUG: ========================');
    return { user, loading, savedUser, currentUrl: window.location.href };
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    debugAuthState
  };

  // Debug log when auth state changes
  console.log('🔍 PROD DEBUG: AuthContext value update - user:', user ? `${user.email} (${user.role})` : 'null', 'loading:', loading);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 