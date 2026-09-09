// Normalize VITE_API_BASE_URL whether it includes `/api` or not.
const normalizeApiUrls = (rawUrl) => {
  const trimmed = String(rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  const baseUrl = trimmed.replace(/\/api$/i, '');
  return {
    BASE_API_URL: baseUrl,
    BACKEND_URL: `${baseUrl}/api`
  };
};

// Dynamic API URL Configuration with Environment Variable Override Support
const getApiUrls = () => {
  // Environment variable override for API base URL
  const fromEnv = normalizeApiUrls(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) {
    return fromEnv;
  }
  
  // Otherwise use environment-based defaults
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
  
  if (isProduction) {
    // Fallback only if VITE_API_BASE_URL was not set at build time.
    // Live API host: moldetest.onrender.com (old moldetest-ftxv.onrender.com is deleted).
    return {
      BASE_API_URL: 'https://moldetest.onrender.com',
      BACKEND_URL: 'https://moldetest.onrender.com/api'
    };
  } else {
    return {
      BASE_API_URL: 'http://localhost:5000',
      BACKEND_URL: 'http://localhost:5000/api'
    };
  }
};

const isProductionHostname = (hostname) => {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return (
    h === 'total-testing-diy.com' ||
    h === 'www.total-testing-diy.com' ||
    h.endsWith('.onrender.com')
  );
};

export const ENVIRONMENT_CONFIG = {
  // Production settings
  PRODUCTION: {
    FRONTEND_URL: 'https://total-testing-diy.com/',
    ...getApiUrls(),
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://opjgytjlebfnhjzarvyy.supabase.co',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    DEBUG: false,
    LOG_LEVEL: 'error'
  },
  
  // Development settings
  DEVELOPMENT: {
    FRONTEND_URL: 'http://localhost:5173',
    ...getApiUrls(),
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://opjgytjlebfnhjzarvyy.supabase.co',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    DEBUG: true,
    LOG_LEVEL: 'debug'
  }
};

// Environment detection
export const getCurrentEnvironment = () => {
  // Check if we're in a build environment (no window object)
  if (typeof window === 'undefined') {
    // Default to development during build
    return {
      isProduction: false,
      isDevelopment: true,
      config: ENVIRONMENT_CONFIG.DEVELOPMENT,
      hostname: 'localhost'
    };
  }
  
  const hostname = window.location.hostname;
  const isDevelopment = hostname === 'localhost' || hostname === '127.0.0.1';
  const isProduction =
    isProductionHostname(hostname) ||
    (!isDevelopment && !!import.meta.env.PROD);
  
  return {
    isProduction,
    isDevelopment,
    config: isProduction ? ENVIRONMENT_CONFIG.PRODUCTION : ENVIRONMENT_CONFIG.DEVELOPMENT,
    hostname
  };
};

// Get environment-specific configuration
export const getEnvironmentConfig = () => {
  const env = getCurrentEnvironment();
  return {
    ...env.config,
    environment: env.isProduction ? 'production' : 'development',
    hostname: env.hostname
  };
};

// Helper functions for dynamic API URL access
export const getBaseApiUrl = () => {
  const apiUrls = getApiUrls();
  return apiUrls.BASE_API_URL;
};

export const getBackendUrl = () => {
  const apiUrls = getApiUrls();
  return apiUrls.BACKEND_URL;
};

// Debug helper
export const logEnvironmentInfo = () => {
  // Only log in browser environment
  if (typeof window === 'undefined') {
    return;
  }
};
