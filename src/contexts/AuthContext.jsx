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
      // Call backend API for authentication
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Sign in failed');
      }

      const userData = await response.json();
      
      // Create user object with token from Flask backend
      const user = {
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.full_name || email.split('@')[0], // Use full_name from user_profiles
        is_admin: userData.user.is_admin || userData.user.role === 'admin',
        role: userData.user.role || 'user',
        access_token: userData.access_token,
        createdAt: new Date().toISOString()
      };
      
      setUser(user);
      localStorage.setItem('mth_user', JSON.stringify(user));
      return { success: true, user: user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message || 'Sign in failed' };
    }
  };

  const signUp = async (email, password, name) => {
    try {
      // Call backend API for registration
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Sign up failed');
      }

      const userData = await response.json();
      
      // Create user object
      const user = {
        id: userData.user_id,
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