// API Configuration for Flask Backend
export const API_CONFIG = {
  // Backend API base URL - Flask backend runs on port 5000
  BASE_URL: 'http://localhost:5000/api',
  
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
      UPDATE: (id) => `/inspection/${id}`
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
  }
};

// Simple configuration getter
export const getApiConfig = () => {
  return API_CONFIG;
}; 