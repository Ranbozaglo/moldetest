// API client for Flask backend communication
import { getApiConfig } from '@/config/api.jsx';
import { logEnvironmentInfo } from '@/config/environment.jsx';

const API_CONFIG = getApiConfig();

// Log environment info on module load
logEnvironmentInfo();

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const headers = {
      'Content-Type': 'application/json',
      ...options.headers
  };
  // Let the browser set multipart boundary for FormData uploads
  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    delete headers['Content-Type'];
  }
  const config = {
    ...options,
    headers,
  };

  // Enhanced logging for production debugging
  const isProduction = window.location.hostname !== 'localhost';
  const logPrefix = isProduction ? '🔍 PROD DEBUG:' : '🔍 DEV DEBUG:';

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
        // Clear localStorage to force re-login
        localStorage.removeItem('mth_user');

        // Reload the page to trigger authentication flow
        setTimeout(() => {
          if (window.location.pathname !== '/SignIn' && window.location.pathname !== '/SignUp') {
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
    return true;
  },

  create: async (data) => {
    const token = getAuthToken();

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
/**
 * @typedef {Object} AsbestosInspection
 * @property {number} id - Unique identifier
 * @property {number} inspection_number - Inspection number
 * @property {string} full_name - Client's full name
 * @property {string} email - Client's email
 * @property {string} client_type - Type of client
 * @property {string} property_type - Type of property
 * @property {string} street_address - Street address
 * @property {string} unit_number - Unit number
 * @property {string} city - City
 * @property {string} state - State
 * @property {string} zip_code - ZIP code
 * @property {string} square_footage - Square footage
 * @property {string} year_built - Year built
 * @property {string} background_info - Background information
 * @property {string} created_at - Creation timestamp
 * @property {string} app_id - Application ID
 * @property {number} inspection_number - Inspection number
 * @property {string} updated_date - Last update timestamp
 * @property {string} created_by_id - Creator's UUID
 * @property {string} status - Inspection status
 * @property {string} location_description - Location description
 * @property {string} material_type - Material type
 * @property {string} material_condition - Material condition
 * @property {string[]} material_images - Material images URLs
 * @property {string[]} lab_analysis_images - Lab analysis images URLs
 */

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
    
    const response = await apiCall(`/asbestosinspection?${queryParams.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  },

  findUnique: async (filters = {}) => {
    const token = getAuthToken();
    
    if (filters.id) {
      // Use findById for detailed data when ID is provided
      return await AsbestosInspection.findById(filters.id);
    }
    
    // Fallback to list endpoint for other filters
    const queryParams = new URLSearchParams();
    const response = await apiCall(`/asbestosinspection?${queryParams.toString()}`, {
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

  findById: async (id) => {
    const token = getAuthToken();
    const response = await apiCall(`/asbestosinspection/${id}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  },

  create: async (data) => {
    const token = getAuthToken();
    const response = await apiCall('/asbestosinspection', {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response;
  },

  update: async (id, data) => {
    const token = getAuthToken();
    const response = await apiCall(`/asbestosinspection/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response;
  },

  delete: async (id) => {
    const token = getAuthToken();
    const response = await apiCall(`/asbestosinspection/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return response;
  },

  // Get detailed inspection data including user profile
  getDetailed: async (id) => {
    const token = getAuthToken();
    const response = await apiCall(`/asbestosinspection/${id}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
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
  try {
    const healthUrl = `${API_CONFIG.BASE_API_URL}/health`;

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      return { healthy: true, data };
    } else {
      return { healthy: false, status: response.status };
    }
  } catch (error) {
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

// Kit fulfillment (COC + prepaid labels)
export const KitService = {
  getPackages: async () => apiCall('/kit/packages'),

  updatePackage: async (packageType, data) => {
    const token = getAuthToken();
    return apiCall(`/kit/packages/${packageType}`, {
      method: 'PUT',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  uploadCoc: async (packageType, file) => {
    const token = getAuthToken();
    const form = new FormData();
    form.append('file', file);
    return apiCall(`/kit/packages/${packageType}/upload-coc`, {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: form,
    });
  },

  listLabels: async (status) => {
    const token = getAuthToken();
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiCall(`/kit/labels${q}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
  },

  uploadLabels: async (files, packageType = '') => {
    const token = getAuthToken();
    const form = new FormData();
    [...files].forEach((f) => form.append('files', f));
    if (packageType) form.append('package_type', packageType);
    return apiCall('/kit/labels/upload', {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: form,
    });
  },

  listFulfillments: async () => {
    const token = getAuthToken();
    return apiCall('/kit/fulfillments', {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
  },

  manualFulfill: async (payload) => {
    const token = getAuthToken();
    return apiCall('/kit/fulfillments/manual', {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  myDownloads: async (email) =>
    apiCall(`/kit/my-downloads?email=${encodeURIComponent(email || '')}`),
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
      try {
        const result = await User.login(email, password);
        return result;
      } catch (error) {
        return { error: error.message };
      }
    },

    // Check current environment
    checkEnv: () => {
      const isProduction = window.location.hostname !== 'localhost';
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
      return savedUser ? JSON.parse(savedUser) : null;
    }
  };
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