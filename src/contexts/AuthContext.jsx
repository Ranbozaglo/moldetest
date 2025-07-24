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

  // Helper function to check if token is expired
  const isTokenExpired = (userData) => {
    if (!userData || !userData.createdAt) return true;
    
    const tokenAge = Date.now() - new Date(userData.createdAt).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    return tokenAge > maxAge;
  };

  // Helper function to validate token with server
  const validateTokenWithServer = async (userData) => {
    try {
      console.log('🔍 PROD DEBUG: Validating token with server...');
      
      // Make a simple API call to validate the token
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://moldetest.onrender.com/api'}/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('🔍 PROD DEBUG: Token validation successful');
        return true;
      } else {
        console.log('🔍 PROD DEBUG: Token validation failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('🔍 PROD DEBUG: Token validation error:', error);
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔍 PROD DEBUG: AuthProvider initializing...');
      
      // Check for existing user session in localStorage
      const savedUser = localStorage.getItem('mth_user');
      console.log('🔍 PROD DEBUG: Saved user from localStorage:', savedUser ? 'exists' : 'not found');
      
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          console.log('🔍 PROD DEBUG: Parsed user data:', userData);
          
          // Check if token is expired based on timestamp
          if (isTokenExpired(userData)) {
            console.log('🔍 PROD DEBUG: Token expired based on timestamp, clearing session');
            localStorage.removeItem('mth_user');
            setLoading(false);
            return;
          }
          
          // Validate token with server (optional - only do this occasionally to avoid too many requests)
          const shouldValidateToken = !userData.lastValidated || 
                                     (Date.now() - new Date(userData.lastValidated).getTime()) > (60 * 60 * 1000); // 1 hour
          
          if (shouldValidateToken) {
            const isValid = await validateTokenWithServer(userData);
            if (!isValid) {
              console.log('🔍 PROD DEBUG: Server token validation failed, clearing session');
              localStorage.removeItem('mth_user');
              setLoading(false);
              return;
            }
            
            // Update last validation timestamp
            userData.lastValidated = new Date().toISOString();
            localStorage.setItem('mth_user', JSON.stringify(userData));
          }
          
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
    };
    
    initializeAuth();
    
    // Set up periodic token validation (every 30 minutes)
    const tokenCheckInterval = setInterval(async () => {
      const savedUser = localStorage.getItem('mth_user');
      if (savedUser && user) {
        try {
          const userData = JSON.parse(savedUser);
          
          // Check if token is getting close to expiration (within 2 hours)
          const tokenAge = Date.now() - new Date(userData.createdAt).getTime();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          const warningAge = 22 * 60 * 60 * 1000; // 22 hours (2 hours before expiration)
          
          if (tokenAge > maxAge) {
            console.log('🔍 PROD DEBUG: Token expired during periodic check, logging out');
            signOut();
          } else if (tokenAge > warningAge) {
            console.log('🔍 PROD DEBUG: Token approaching expiration, validating with server');
            const isValid = await validateTokenWithServer(userData);
            if (!isValid) {
              console.log('🔍 PROD DEBUG: Token validation failed during periodic check, logging out');
              signOut();
            }
          }
        } catch (error) {
          console.error('🔍 PROD DEBUG: Error during periodic token check:', error);
        }
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    // Cleanup interval on unmount
    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [user]);

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
        createdAt: new Date().toISOString(),
        lastValidated: new Date().toISOString()
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

  // Function to refresh the user session
  const refreshSession = async () => {
    console.log('🔍 PROD DEBUG: Refreshing user session...');
    const savedUser = localStorage.getItem('mth_user');
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        
        // Check if we need to refresh
        if (isTokenExpired(userData)) {
          console.log('🔍 PROD DEBUG: Token expired, need to re-login');
          signOut();
          return false;
        }
        
        // Update last validated timestamp
        userData.lastValidated = new Date().toISOString();
        localStorage.setItem('mth_user', JSON.stringify(userData));
        setUser(userData);
        
        console.log('🔍 PROD DEBUG: Session refreshed successfully');
        return true;
      } catch (error) {
        console.error('🔍 PROD DEBUG: Error refreshing session:', error);
        signOut();
        return false;
      }
    }
    
    return false;
  };

  // Debug helper function
  const debugAuthState = () => {
    const savedUser = localStorage.getItem('mth_user');
    let tokenStatus = 'No token';
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        const expired = isTokenExpired(userData);
        tokenStatus = expired ? 'Expired' : 'Valid';
      } catch (e) {
        tokenStatus = 'Invalid JSON';
      }
    }
    
    console.log('🔍 PROD DEBUG: === AUTH STATE DEBUG ===');
    console.log('🔍 PROD DEBUG: React state user:', user);
    console.log('🔍 PROD DEBUG: Loading state:', loading);
    console.log('🔍 PROD DEBUG: localStorage mth_user:', savedUser ? 'exists' : 'none');
    console.log('🔍 PROD DEBUG: Token status:', tokenStatus);
    console.log('🔍 PROD DEBUG: Current URL:', window.location.href);
    console.log('🔍 PROD DEBUG: ========================');
    return { user, loading, savedUser, tokenStatus, currentUrl: window.location.href };
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
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