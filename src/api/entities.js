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
  
  console.log(`${logPrefix} API Call: ${options.method || 'GET'} ${url}`);
  console.log(`${logPrefix} Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`${logPrefix} Backend URL: ${API_CONFIG.BASE_URL}`);
  
  if (options.body) {
    console.log(`${logPrefix} Request body:`, JSON.parse(options.body));
  }
  
  // Add timeout for production
  const timeoutMs = isProduction ? 15000 : 30000;
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    console.log(`${logPrefix} Starting fetch request...`);
    const response = await Promise.race([fetch(url, config), timeoutPromise]);
    
    console.log(`${logPrefix} Response received:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
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
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    console.log(`${logPrefix} API Success:`, {
      url,
      method: options.method || 'GET',
      dataReceived: !!data,
      dataKeys: data ? Object.keys(data) : []
    });
    
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
    const response = await apiCall('/inspection', {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        full_name: data.full_name,
        street_address: data.street_address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        property_type: data.property_type,
        client_type: data.client_type,
        square_footage: data.square_footage,
        has_visible_mold: data.has_visible_mold,
        mold_locations: data.mold_locations,
        has_water_damage: data.has_water_damage,
        water_damage_locations: data.water_damage_locations,
        status: data.status || 'pending',
        email: data.email,
        is_sample: data.is_sample || false,
        created_by: data.created_by // Pass created_by if present
      })
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
  
  update: async (idOrFilters, data) => {
    const token = getAuthToken();
    let id;
    if (typeof idOrFilters === 'string') {
      id = idOrFilters;
    } else {
      id = idOrFilters.id;
    }
    
    console.log("🔍 DEBUG: MoldInspection.update called with:", {
      idOrFilters,
      id,
      data,
      token: token ? "present" : "missing"
    });
    
    const response = await apiCall(`/inspection/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    console.log("🔍 DEBUG: MoldInspection.update response:", response);
    return response;
  },
  
  list: async (sortBy = '-created_at', limit = 10) => {
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
    const healthUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}/health`;
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
  send: async (to, subject, content) => {
    const token = getAuthToken();
    const response = await apiCall('/email/send', {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, subject, content })
    });
    return response;
  }
};

// Production debugging helper - attach to window for console access
if (typeof window !== 'undefined') {
  window.debugBackend = {
    // Test backend connectivity
    testHealth: () => checkBackendHealth(),
    
    // Test login endpoint
    testLogin: async (email = 'rotemiluz53@gmail.com', password = 'admin123') => {
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
        backendUrl: API_CONFIG.BASE_URL,
        currentUrl: window.location.href
      });
      return { isProduction, backendUrl: API_CONFIG.BASE_URL };
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

// Default export for backward compatibility
export default {
  MoldInspection,
  Sample,
  User,
  EmailService
};