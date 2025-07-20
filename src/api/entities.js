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

  // Debug logging in development
  if (API_CONFIG.DEBUG) {
    console.log(`🔍 API Call: ${options.method || 'GET'} ${url}`);
    if (options.body) {
      console.log('🔍 Request body:', JSON.parse(options.body));
    }
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      
      if (API_CONFIG.DEBUG) {
        console.error(`❌ API Error: ${options.method || 'GET'} ${url}`, errorMessage);
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    if (API_CONFIG.DEBUG) {
      console.log(`✅ API Success: ${options.method || 'GET'} ${url}`, data);
    }
    
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
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
        is_sample: data.is_sample || false
      })
    });
    
    // Extract the inspection data from the response
    // Backend returns: {"message": "...", "inspection": {...}}
    // Frontend expects: {...} (just the inspection data)
    return response.inspection || response;
  },
  
  findMany: async (filters = {}) => {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();
    
    if (filters.user_id) {
      queryParams.append('created_by_id', filters.user_id);
    }
    
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
  
  list: async (sortBy = '-created_at', limit = 10) => {
    console.log("🔍 DEBUG: MoldInspection.list called with:", { sortBy, limit });
    
    const token = getAuthToken();
    const queryParams = new URLSearchParams();
    
    if (sortBy) {
      queryParams.append('sort', sortBy);
    }
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    
    const response = await apiCall(`/inspection?${queryParams.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    console.log("🔍 DEBUG: MoldInspection.list returning:", response);
    return response;
  },
  
  filter: async (filters = {}, sortBy = '-created_at', limit = 10) => {
    const token = getAuthToken();
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

// User entity for authentication
export const User = {
  login: async (email, password) => {
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

// LLM service
export const LLMService = {
  summarize: async (text) => {
    const token = getAuthToken();
    const response = await apiCall('/llm/summarize', {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    return response;
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

// Default export for backward compatibility
export default {
  MoldInspection,
  Sample,
  User,
  LLMService,
  EmailService
};