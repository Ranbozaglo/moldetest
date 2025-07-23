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
    // Check for existing user session in localStorage
    const savedUser = localStorage.getItem('mth_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        
        // Update admin role for specific emails if needed
        const adminEmails = ['rotemiluz53@gmail.com'];
        if (adminEmails.includes(userData.email) && userData.role !== 'admin') {
          userData.role = 'admin';
          localStorage.setItem('mth_user', JSON.stringify(userData));
        }
        
        setUser(userData);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('mth_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email, password) => {
    try {
      console.log('🔍 DEBUG: AuthContext signIn called with:', { email });
      
      // Call backend API for authentication
      const response = await User.login(email, password);
      console.log('🔍 DEBUG: Backend login response:', response);
      
      // Ensure we have the required response structure
      if (!response || !response.user || !response.access_token) {
        throw new Error('Invalid response from server');
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
      
      console.log('🔍 DEBUG: Created user object:', user);
      
      setUser(user);
      localStorage.setItem('mth_user', JSON.stringify(user));
      
      console.log('🔍 DEBUG: User state updated and saved to localStorage');
      
      return { success: true, user: user };
    } catch (error) {
      console.error('🔍 DEBUG: Sign in error:', error);
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
    setUser(null);
    localStorage.removeItem('mth_user');
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 