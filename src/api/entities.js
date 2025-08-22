// API client for Flask backend communication
import { getApiConfig } from '@/config/api.js';
import { logEnvironmentInfo } from '@/config/environment.js';

const API_CONFIG = getApiConfig();

// Log environment info on module load
logEnvironmentInfo();

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  // Enhanced logging for production debugging
  const isProduction = window.location.hostname !== 'localhost';
  const logPrefix = isProduction ? '🔍 PROD DEBUG:' : '🔍 DEV DEBUG:';

  
  if (options.body) {
    console.log(`${logPrefix} Request body:`, JSON.parse(options.body));
  }
  
  // Add timeout for production
  const timeoutMs = isProduction ? 15000 : 30000;
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const response = await Promise.race([fetch(url, config), timeoutPromise]);
    

    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      
      console.error(`${logPrefix} API Error:`, {
        url,
        method: options.method || 'GET',
        status: response.status,
        errorMessage,
        errorData
      });
      
      // Handle authentication errors specifically
      if (response.status === 401 || response.status === 403) {
        console.log(`${logPrefix} Authentication error detected, clearing session`);
        
        // Clear localStorage to force re-login
        localStorage.removeItem('mth_user');
        
        // Reload the page to trigger authentication flow
        setTimeout(() => {
          if (window.location.pathname !== '/SignIn' && window.location.pathname !== '/Welcome') {
            console.log(`${logPrefix} Redirecting to sign in due to auth error`);
            window.location.href = '/SignIn';
          }
        }, 1000);
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();

    
    return data;
  } catch (error) {
    console.error(`${logPrefix} API call failed:`, {
      endpoint,
      url,
      method: options.method || 'GET',
      error: error.message,
      stack: error.stack
    });
    throw error;
  } 
};

// Helper function to get auth token
const getAuthToken = () => {
  const user = localStorage.getItem('mth_user');
  if (user) {
    const userData = JSON.parse(user);
    return userData.access_token; // Flask backend uses access_token
  }
  return null;
};

// Mold Inspection entity
export const MoldInspection = {
  // Debug method to check if the object is properly exported
  debug: () => {
    console.log("🔍 DEBUG: MoldInspection object is available");
    console.log("🔍 DEBUG: MoldInspection methods:", Object.keys(MoldInspection));
    return true;
  },

  create: async (data) => {
    const token = getAuthToken();
    
    // Debug: Log the inspection data being sent to verify image data
    console.log("🔍 DEBUG: MoldInspection.create - Full data being sent:", data);
    console.log("🔍 DEBUG: MoldInspection.create - Visible mold details:", data.visible_mold_details);
    console.log("🔍 DEBUG: MoldInspection.create - Water damage details:", data.water_damage_details);
    console.log("🔍 DEBUG: MoldInspection.create - Thermostat image:", data.thermostat_image);
    
    const requestBody = {
      full_name: data.full_name,
      street_address: data.street_address,
      unit_number: data.unit_number,
      city: data.city,
      state: data.state,
      zip_code: data.zip_code,
      property_type: data.property_type,
      client_type: data.client_type,
      square_footage: data.square_footage,
      background_info: data.background_info,
      has_visible_mold: data.has_visible_mold,
      visible_mold_details: data.visible_mold_details, // ✅ Fixed: Use correct field name with images
      has_water_damage: data.has_water_damage,
      water_damage_details: data.water_damage_details, // ✅ Fixed: Use correct field name with images
      environmental_data_method: data.environmental_data_method,
      thermostat_image: data.thermostat_image,
      temperature: data.temperature,
      humidity: data.humidity,
      status: data.status || 'pending',
      email: data.email,
      is_sample: data.is_sample || false,
      created_by: data.created_by, // Pass created_by if present
      client_status_detail: data.client_status_detail,
      created_date: data.created_date
    };
    
    console.log("🔍 DEBUG: MoldInspection.create - Request body being sent:", requestBody);
    
    const response = await apiCall('/inspection', {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Extract the inspection data from the response
    // Backend returns: {"message": "...", "inspection": {...}}
    // Frontend expects: {...} (just the inspection data)
    return response.inspection || response;
  },
  
  findMany: async (filters = {}) => {
    const token = getAuthToken();
    const user = localStorage.getItem('mth_user');
    let email = '';
    let isAdmin = false;
    
    if (user) {
      const userData = JSON.parse(user);
      email = userData.email;
      isAdmin = userData.role === 'admin' || userData.is_admin;
    }
    
    const queryParams = new URLSearchParams();
    
    // Add admin-specific parameters
    if (isAdmin) {
      queryParams.append('sort', '-created_at');
      queryParams.append('limit', '1000');
    }
    
    // Only send email filter for non-admin users
    // Admin users get ALL inspections without email filtering
    if (email && !isAdmin) {
      queryParams.append('email', email);
    }
    // Note: Admin users don't send email parameter to get ALL data
    
    const response = await apiCall(`/inspection?${queryParams.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  },
  
  findUnique: async (filters) => {
    const token = getAuthToken();
    const response = await apiCall(`/inspection/${filters.id}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  },
  
  update: async (id, data) => {
    const token = getAuthToken();
    
    if (!id) {
      throw new Error("Inspection ID is required");
    }
    
    const response = await apiCall(`/inspection/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    return response;
  },
  
  list: async (sortBy = '-created_at', limit = 10, detailed = false) => {
    const token = getAuthToken();
    const user = localStorage.getItem('mth_user');
    let email = '';
    let isAdmin = false;
    
    if (user) {
      const userData = JSON.parse(user);
      email = userData.email;
      isAdmin = userData.role === 'admin' || userData.is_admin;
    }
    
    // Use higher limit and ensure proper sort for admin users
    if (isAdmin) {
      sortBy = sortBy || '-created_at';
      limit = limit === 10 ? 50 : limit; // Limit to 50 for performance
    }
    
    const queryParams = new URLSearchParams();
    if (sortBy) {
      queryParams.append('sort', sortBy);
    }
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    
    // Add detailed parameter for heavy data
    if (detailed) {
      queryParams.append('detailed', 'true');
    }
    
    // Only send email filter for non-admin users
    // Admin users get ALL inspections without email filtering
    if (email && !isAdmin) {
      queryParams.append('email', email);
    }
    
    const response = await apiCall(`/inspection?${queryParams.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  },
  
  // New method for getting detailed inspection data
  getDetailed: async (id) => {
    const token = getAuthToken();
    const response = await apiCall(`/inspection/${id}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  },
  
  filter: async (filters = {}, sortBy = '-created_at', limit = 10) => {
    const token = getAuthToken();
    const user = localStorage.getItem('mth_user');
    let email = '';
    let isAdmin = false;
    
    if (user) {
      const userData = JSON.parse(user);
      email = userData.email;
      isAdmin = userData.role === 'admin' || userData.is_admin;
    }
    
    // Use higher limit and ensure proper sort for admin users
    if (isAdmin) {
      sortBy = sortBy || '-created_at';
      limit = limit === 10 ? 1000 : limit; // Use 1000 if default limit
    }
    
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        if (Array.isArray(filters[key])) {
          filters[key].forEach(value => queryParams.append(key, value));
        } else {
          queryParams.append(key, filters[key]);
        }
      }
    });
    
    if (sortBy) {
      queryParams.append('sort', sortBy);
    }
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    
    // Only send email filter for non-admin users
    // Admin users get ALL inspections without email filtering
    if (email && !isAdmin) {
      queryParams.append('email', email);
    }
    // Note: Admin users don't send email parameter to get ALL data
    
    const response = await apiCall(`/inspection?${queryParams.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    return response;
  },

  delete: async (id) => {
    const token = getAuthToken();
    const response = await apiCall(`/inspection/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  }
};

// Asbestos Inspection entity
export const AsbestosInspection = {
  list: async (sortBy = '-created_at', limit = 50) => {
    const token = getAuthToken();
    const user = localStorage.getItem('mth_user');
    let email = '';
    let isAdmin = false;
    
    if (user) {
      const userData = JSON.parse(user);
      email = userData.email;
      isAdmin = userData.role === 'admin' || userData.is_admin;
    }
    
    // Use higher limit for admin users
    if (isAdmin) {
      sortBy = sortBy || '-created_at';
      limit = limit === 50 ? 100 : limit; // Limit to 100 for performance
    }
    
    const queryParams = new URLSearchParams();
    if (sortBy) {
      queryParams.append('sort', sortBy);
    }
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    
    // Only send email filter for non-admin users
    // Admin users get ALL inspections without email filtering
    if (email && !isAdmin) {
      queryParams.append('email', email);
    }
    
    const response = await apiCall(`/asbestos-inspections?${queryParams.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  },

  findUnique: async (filters = {}) => {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();
    
    if (filters.id) {
      queryParams.append('id', filters.id);
    }
    
    const response = await apiCall(`/asbestos-inspections?${queryParams.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    // Return the first inspection if it's an array, or the response directly
    if (Array.isArray(response) && response.length > 0) {
      return response[0];
    }
    return response;
  },

  update: async (id, data) => {
    const token = getAuthToken();
    const response = await apiCall(`/asbestos-inspections/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response;
  }
};

// Sample entity
export const Sample = {
  create: async (data) => {
    const token = getAuthToken();
    const response = await apiCall('/samples', {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inspection_id: data.inspection_id,
        location: data.location,
        description: data.description || data.sample_type,
        sample_image: data.sample_image
      })
    });
    return response;
  },
  
  findMany: async (filters = {}) => {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();
    
    if (filters.inspection_id) {
      queryParams.append('inspection_id', filters.inspection_id);
    }
    
    const response = await apiCall(`/samples?${queryParams.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  },
  
  bulkCreate: async (dataArray) => {
    const token = getAuthToken();
    const promises = dataArray.map(data => 
      apiCall('/samples', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inspection_id: data.inspection_id,
          location: data.location,
          description: data.description || data.sample_type,
          sample_image: data.sample_image
        })
      })
    );
    
    const results = await Promise.all(promises);
    return results;
  }
};

// Backend health check (for production debugging)
const checkBackendHealth = async () => {
  const isProduction = window.location.hostname !== 'localhost';
  const logPrefix = isProduction ? '🔍 PROD DEBUG:' : '🔍 DEV DEBUG:';
  
  console.log(`${logPrefix} Checking backend health...`);
  
  try {
    const healthUrl = `${API_CONFIG.BASE_API_URL}/health`;
    console.log(`${logPrefix} Health check URL: ${healthUrl}`);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`${logPrefix} Health check response:`, {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`${logPrefix} Backend is healthy:`, data);
      return { healthy: true, data };
    } else {
      console.error(`${logPrefix} Backend health check failed:`, response.status);
      return { healthy: false, status: response.status };
    }
  } catch (error) {
    console.error(`${logPrefix} Backend health check error:`, error.message);
    return { healthy: false, error: error.message };
  }
};

// User entity for authentication
export const User = {
  login: async (email, password) => {
    // Check backend health first in production
    const isProduction = window.location.hostname !== 'localhost';
    if (isProduction) {
      const health = await checkBackendHealth();
      if (!health.healthy) {
        throw new Error(`Backend is not responding: ${health.error || health.status}`);
      }
    }
    
    const response = await apiCall('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    return response;
  },

  register: async (email, password) => {
    const response = await apiCall('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    return response;
  },

  isAdmin: () => {
    const savedUser = localStorage.getItem('mth_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      return userData.is_admin === true || userData.role === 'admin';
    }
    return false;
  }
};

// Email service
export const EmailService = {
  sendLabReceivedEmail: async (inspectionId) => {
    const token = getAuthToken();
    const response = await apiCall(`/email/send-lab-received/${inspectionId}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    return response;
  },

  sendReportReadyEmail: async (inspectionId) => {
    const token = getAuthToken();
    const response = await apiCall(`/email/send-report-ready/${inspectionId}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    return response;
  },

  sendReviewRequestEmail: async (inspectionId) => {
    const token = getAuthToken();
    const response = await apiCall(`/email/send-review-request/${inspectionId}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    return response;
  },

  sendInspectionCreatedEmail: async (inspectionId) => {
    const token = getAuthToken();
    const response = await apiCall(`/email/send-inspection-created/${inspectionId}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    return response;
  },

  // Email template management
  getTemplates: async () => {
    const token = getAuthToken();
    const response = await apiCall('/email/templates', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  },

  saveTemplates: async (templates) => {
    const token = getAuthToken();
    const response = await apiCall('/email/templates', {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templates)
    });
    return response;
  },

  resetTemplates: async () => {
    const token = getAuthToken();
    const response = await apiCall('/email/templates/reset', {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    return response;
  }
};

// Production debugging helper - attach to window for console access
if (typeof window !== 'undefined') {
  window.debugBackend = {
    // Test backend connectivity
    testHealth: () => checkBackendHealth(),
    
    // Test login endpoint - no default credentials
    testLogin: async (email, password) => {
      if (!email || !password) {
        throw new Error('Email and password are required for login test');
      }
      console.log('🔍 PROD DEBUG: Testing login endpoint...');
      try {
        const result = await User.login(email, password);
        console.log('🔍 PROD DEBUG: Login test successful:', result);
        return result;
      } catch (error) {
        console.error('🔍 PROD DEBUG: Login test failed:', error);
        return { error: error.message };
      }
    },
    
    // Check current environment
    checkEnv: () => {
      const isProduction = window.location.hostname !== 'localhost';
      console.log('🔍 PROD DEBUG: Environment info:', {
        isProduction,
        hostname: window.location.hostname,
        baseApiUrl: API_CONFIG.BASE_API_URL,
        backendUrl: API_CONFIG.BACKEND_URL,
        fullApiUrl: API_CONFIG.BASE_URL,
        currentUrl: window.location.href
      });
      return { 
        isProduction, 
        baseApiUrl: API_CONFIG.BASE_API_URL,
        backendUrl: API_CONFIG.BACKEND_URL,
        fullApiUrl: API_CONFIG.BASE_URL 
      };
    },
    
    // Check localStorage auth state
    checkAuth: () => {
      const savedUser = localStorage.getItem('mth_user');
      console.log('🔍 PROD DEBUG: Auth state:', {
        hasStoredUser: !!savedUser,
        userData: savedUser ? JSON.parse(savedUser) : null
      });
      return savedUser ? JSON.parse(savedUser) : null;
    }
  };
  
  console.log('🔍 PROD DEBUG: Backend debugging tools available via window.debugBackend');
  console.log('🔍 PROD DEBUG: Try: debugBackend.testHealth(), debugBackend.testLogin(), debugBackend.checkEnv(), debugBackend.checkAuth()');
}

// Password Reset API Functions
export class PasswordResetService {
  /**
   * Request password reset - sends reset email to user
   * @param {string} email - User's email address
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  static async requestPasswordReset(email) {
    try {
      const response = await apiCall('/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      
      return {
        success: true,
        message: response.message || 'If an account with that email exists, you will receive a password reset link.'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send reset email. Please try again.'
      };
    }
  }

  /**
   * Confirm password reset - validates token and updates password
   * @param {string} token - Reset token from email
   * @param {string} password - New password
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  static async confirmPasswordReset(token, password) {
    try {
      const response = await apiCall('/auth/confirm-password-reset', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });
      
      return {
        success: true,
        message: response.message || 'Password has been reset successfully. You can now sign in with your new password.'
      };
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset password. Please try again.'
      };
    }
  }
}