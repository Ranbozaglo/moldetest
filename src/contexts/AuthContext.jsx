import React, { createContext, useContext, useState, useEffect } from 'react';

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
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('mth_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email, password) => {
    try {
      // Simulate API call - in a real app, this would be an actual API endpoint
      // For demo purposes, we'll accept any email/password combination
      const mockUser = {
        id: '1',
        email: email,
        name: email.split('@')[0],
        role: email.includes('admin') ? 'admin' : 'user',
        createdAt: new Date().toISOString()
      };
      
      setUser(mockUser);
      localStorage.setItem('mth_user', JSON.stringify(mockUser));
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Sign in failed' };
    }
  };

  const signUp = async (email, password, name) => {
    try {
      // Simulate API call - in a real app, this would be an actual API endpoint
      const mockUser = {
        id: Date.now().toString(),
        email: email,
        name: name,
        role: 'user',
        createdAt: new Date().toISOString()
      };
      
      setUser(mockUser);
      localStorage.setItem('mth_user', JSON.stringify(mockUser));
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Sign up failed' };
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