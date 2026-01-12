/**
 * Authentication Utilities
 * Helper functions for managing authentication state and preventing frequent login prompts
 */

// Check if user is authenticated and token is valid
export const isAuthenticated = () => {
  const savedUser = localStorage.getItem('mth_user');
  if (!savedUser) return false;
  
  try {
    const userData = JSON.parse(savedUser);
    return userData && userData.access_token && userData.email;
  } catch (error) {
    console.error('Error parsing user data:', error);
    localStorage.removeItem('mth_user');
    return false;
  }
};

// Check if token is expired based on timestamp
export const isTokenExpired = (userData = null) => {
  if (!userData) {
    const savedUser = localStorage.getItem('mth_user');
    if (!savedUser) return true;
    
    try {
      userData = JSON.parse(savedUser);
    } catch (error) {
      return true;
    }
  }
  
  if (!userData || !userData.createdAt) return true;
  
  const tokenAge = Date.now() - new Date(userData.createdAt).getTime();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  return tokenAge > maxAge;
};

// Get the current user data
export const getCurrentUser = () => {
  const savedUser = localStorage.getItem('mth_user');
  if (!savedUser) return null;
  
  try {
    const userData = JSON.parse(savedUser);
    
    // Check if token is expired
    if (isTokenExpired(userData)) {
      localStorage.removeItem('mth_user');
      return null;
    }
    
    return userData;
  } catch (error) {
    console.error('Error parsing user data:', error);
    localStorage.removeItem('mth_user');
    return null;
  }
};

// Clear authentication data
export const clearAuth = () => {
  localStorage.removeItem('mth_user');
};

// Validate token with server
export const validateTokenWithServer = async (userData = null) => {
  if (!userData) {
    userData = getCurrentUser();
  }
  
  if (!userData || !userData.access_token) {
    return false;
  }
  
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://moldetest-ftxv.onrender.com/api';
    const response = await fetch(`${apiBaseUrl}/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userData.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// Update last validation timestamp
export const updateLastValidation = (userData = null) => {
  if (!userData) {
    userData = getCurrentUser();
  }
  
  if (userData) {
    userData.lastValidated = new Date().toISOString();
    localStorage.setItem('mth_user', JSON.stringify(userData));
    return userData;
  }
  
  return null;
};

// Check if we should validate token with server (avoid too frequent calls)
export const shouldValidateWithServer = (userData = null) => {
  if (!userData) {
    userData = getCurrentUser();
  }
  
  if (!userData) return false;
  
  // Validate if no previous validation or last validation was more than 1 hour ago
  if (!userData.lastValidated) return true;
  
  const lastValidationAge = Date.now() - new Date(userData.lastValidated).getTime();
  const validationInterval = 60 * 60 * 1000; // 1 hour
  
  return lastValidationAge > validationInterval;
};

// Enhanced authentication check with automatic cleanup
export const requireAuth = async (redirectTo = '/SignIn') => {
  const userData = getCurrentUser();

  if (!userData) {
    if (typeof window !== 'undefined' && window.location.pathname !== redirectTo) {
      window.location.href = redirectTo;
    }
    return false;
  }

  // Check if we should validate with server
  if (shouldValidateWithServer(userData)) {
    const isValid = await validateTokenWithServer(userData);

    if (!isValid) {
      clearAuth();
      if (typeof window !== 'undefined' && window.location.pathname !== redirectTo) {
        window.location.href = redirectTo;
      }
      return false;
    }

    // Update validation timestamp
    updateLastValidation(userData);
  }

  return true;
};

// Debug function for troubleshooting
export const debugAuth = () => {
  const savedUser = localStorage.getItem('mth_user');
  let tokenStatus = 'No token';
  let userData = null;
  
  if (savedUser) {
    try {
      userData = JSON.parse(savedUser);
      const expired = isTokenExpired(userData);
      tokenStatus = expired ? 'Expired' : 'Valid';
    } catch (e) {
      tokenStatus = 'Invalid JSON';
    }
  }
  
  const debugInfo = {
    hasToken: !!savedUser,
    tokenStatus,
    userData: userData ? {
      email: userData.email,
      role: userData.role,
      createdAt: userData.createdAt,
      lastValidated: userData.lastValidated
    } : null,
    currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
  };

  return debugInfo;
};

// Make authentication utilities available globally for debugging
if (typeof window !== 'undefined') {
  window.authUtils = {
    isAuthenticated,
    isTokenExpired,
    getCurrentUser,
    clearAuth,
    validateTokenWithServer,
    requireAuth,
    debugAuth
  };
} 