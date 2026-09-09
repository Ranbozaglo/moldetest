import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { User } from '@/api/entities';
import { getBackendUrl } from '@/config/environment.jsx';

// Create context with default value to prevent undefined context errors
const AuthContext = createContext({
  user: null,
  loading: true,
  signIn: () => Promise.resolve({ success: false, error: 'AuthProvider not initialized' }),
  signUp: () => Promise.resolve({ success: false, error: 'AuthProvider not initialized' }),
  signOut: () => {},
  refreshSession: () => Promise.resolve(false),
  debugAuthState: () => ({})
});

export const useAuth = () => {
  const context = useContext(AuthContext);

  // Add debugging to help identify when this error occurs
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const lastValidationRef = useRef(null);
  const initializationRef = useRef(false);

  // Helper function to check if token is expired
  const isTokenExpired = (userData) => {
    if (!userData || !userData.createdAt) return true;
    
    // Disable token expiration - tokens never expire
    // const tokenAge = Date.now() - new Date(userData.createdAt).getTime();
    // const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    // return tokenAge > maxAge;
    
    return false; // Tokens never expire
  };

  // Helper function to validate token with server
  const validateTokenWithServer = useCallback(async (userData) => {
    try {
      // Make a simple API call to validate the token
      const response = await fetch(`${getBackendUrl()}/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      // Don't log out on network errors - let the user continue with their session
      // Only log out if it's a clear authentication error, not a network issue
      return true; // Allow session to continue on network errors
    }
  }, []);

  // Define signOut function before using it in useEffect
  const signOut = useCallback(() => {
    setUser(null);
    localStorage.removeItem('mth_user');

    // Clear inspection data to prevent session mixing
    localStorage.removeItem('inspection_current_step');
    localStorage.removeItem('inspection_form_data');
  }, []);

  // Initialize auth only once on mount
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeAuth = async () => {
      // Check for existing user session in localStorage
      const savedUser = localStorage.getItem('mth_user');

      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);

          // Check if we have a valid access_token
          if (!userData.access_token) {
            localStorage.removeItem('mth_user');
            setLoading(false);
            return;
          }

          // Check if token is expired based on timestamp
          if (isTokenExpired(userData)) {
            localStorage.removeItem('mth_user');
            setLoading(false);
            return;
          }

          // For page refreshes, immediately restore the user session
          // and validate in the background to avoid blocking the UI
          setUser(userData);
          setLoading(false);

          // Validate token with server in the background (non-blocking)
          const isValid = await validateTokenWithServer(userData);

          if (!isValid) {
            // Don't immediately log out - let the user continue their work
            // The periodic validation will handle this later
          } else {
            // Update last validation timestamp
            userData.lastValidated = new Date().toISOString();
            localStorage.setItem('mth_user', JSON.stringify(userData));
          }
        } catch (error) {
          localStorage.removeItem('mth_user');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, [validateTokenWithServer]); // Add validateTokenWithServer to dependencies

  // Set up periodic token validation separately
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only set up interval if user is logged in
    if (!user) return;

    // Set up periodic token validation (every 2 hours)
    intervalRef.current = setInterval(async () => {
      const savedUser = localStorage.getItem('mth_user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);

          // Validate token with server
          const isValid = await validateTokenWithServer(userData);
          if (!isValid) {
            signOut();
          } else {
            // Update last validation timestamp
            userData.lastValidated = new Date().toISOString();
            localStorage.setItem('mth_user', JSON.stringify(userData));
          }
        } catch (error) {
          signOut();
        }
      }
    }, 2 * 60 * 60 * 1000); // 2 hours
    
    // Cleanup interval on user change or unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, validateTokenWithServer, signOut]); // Add signOut to dependencies

  const signIn = useCallback(async (email, password) => {
    try {
      // Call backend API for authentication
      const response = await User.login(email, password);

      // Ensure we have the required response structure
      if (!response || !response.user || !response.access_token) {
        throw new Error(`Invalid response from server - missing ${!response ? 'response' : !response.user ? 'user' : 'access_token'}`);
      }

      // Create user object with token from Flask backend
      // Admin role is determined only by Supabase database values
      const isAdminUser = response.user.is_admin || response.user.role === 'admin';

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

      setUser(user);
      localStorage.setItem('mth_user', JSON.stringify(user));

      return { success: true, user: user };
    } catch (error) {
      // No hardcoded admin fallbacks - use Supabase database only

      return { success: false, error: error.message || 'Sign in failed' };
    }
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    try {
      // Call backend API for registration
      const response = await User.register(email, password);
      
      // Create user object with role from Supabase database only
      const user = {
        id: response.user_id,
        email: email,
        name: name || email.split('@')[0],
        is_admin: response.is_admin || false,
        role: response.role || 'user',
        createdAt: new Date().toISOString()
      };
      
      setUser(user);
      localStorage.setItem('mth_user', JSON.stringify(user));
      return { success: true, user: user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message || 'Sign up failed' };
    }
  }, []);

  // Function to refresh the user session
  const refreshSession = useCallback(async () => {
    const savedUser = localStorage.getItem('mth_user');

    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);

        // Check if we need to refresh
        if (isTokenExpired(userData)) {
          signOut();
          return false;
        }

        // Update last validated timestamp
        userData.lastValidated = new Date().toISOString();
        localStorage.setItem('mth_user', JSON.stringify(userData));
        setUser(userData);

        return true;
      } catch (error) {
        signOut();
        return false;
      }
    }

    return false;
  }, [signOut]);

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

    return { user, loading, savedUser, tokenStatus, currentUrl: window.location.href };
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
    debugAuthState
  }), [user, loading, signIn, signUp, signOut, refreshSession, debugAuthState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};