// API Configuration for Flask Backend
import { getEnvironmentConfig, getBaseApiUrl, getBackendUrl } from './environment.jsx';

const envConfig = getEnvironmentConfig();

export const API_CONFIG = {
  // Dynamic backend API base URL based on environment
  BASE_URL: envConfig.BACKEND_URL,
  
  // Base API URL without /api suffix (for other endpoints like /health)
  BASE_API_URL: getBaseApiUrl(),
  
  // Full backend URL with /api (for main API endpoints)
  BACKEND_URL: getBackendUrl(),
  
  // Environment detection
  ENVIRONMENT: envConfig.environment,
  
  // Production URL for the frontend
  PRODUCTION_URL: 'total-testing-diy.com',
  
  // API endpoints matching Flask backend and actual database schema
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register'
    },
    INSPECTIONS: {
      LIST: '/inspection',
      CREATE: '/inspection',
      GET: (id) => `/inspection/${id}`,
      UPDATE: (id) => `/inspection/${id}`,
      DELETE: (id) => `/inspection/${id}`
    },
    SAMPLES: {
      LIST: '/samples',
      CREATE: '/samples',
      GET: (id) => `/samples/${id}`,
      UPDATE: (id) => `/samples/${id}`
    },
    LLM: {
      SUMMARIZE: '/llm/summarize'
    },
    EMAIL: {
      SEND: '/email/send'
    }
  },
  
  // Request timeout (in milliseconds)
  TIMEOUT: 30000,
  
  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000
  },
  
  // Environment-specific settings
  DEBUG: envConfig.DEBUG,
  LOG_LEVEL: envConfig.LOG_LEVEL
};

// Simple configuration getter
export const getApiConfig = () => {
  return API_CONFIG;
};

// Environment detection helper
export const getEnvironment = () => {
  return {
    ...envConfig,
    apiConfig: API_CONFIG
  };
};

// Direct access to dynamic URLs (for convenience)
export const BASE_API_URL = API_CONFIG.BASE_API_URL;
export const BACKEND_URL = API_CONFIG.BACKEND_URL;
export const FULL_API_URL = API_CONFIG.BASE_URL; 