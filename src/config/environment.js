// Environment Configuration
export const ENVIRONMENT_CONFIG = {
  // Production settings
  PRODUCTION: {
    FRONTEND_URL: 'https://mold-testing.netlify.app',
    BACKEND_URL: import.meta.env.VITE_API_BASE_URL || 'https://moldetest.onrender.com/api', // Updated with actual Render URL
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://qtrypzzcjebvfcihiynt.supabase.co',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cnlwempjamVidmZjaWhpeW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzAsImV4cCI6MjA1MDU0ODk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8',
    DEBUG: false,
    LOG_LEVEL: 'error'
  },
  
  // Development settings
  DEVELOPMENT: {
    FRONTEND_URL: 'http://localhost:5173',
    BACKEND_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://qtrypzzcjebvfcihiynt.supabase.co',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cnlwempjamVidmZjaWhpeW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzAsImV4cCI6MjA1MDU0ODk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8',
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
  const isProduction = hostname === 'mold-testing.netlify.app' || import.meta.env.PROD;
  const isDevelopment = hostname === 'localhost' || hostname === '127.0.0.1' || import.meta.env.DEV;
  
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

// Debug helper
export const logEnvironmentInfo = () => {
  // Only log in browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  const env = getCurrentEnvironment();
  console.log('🌍 Environment Info:', {
    isProduction: env.isProduction,
    isDevelopment: env.isDevelopment,
    hostname: env.hostname,
    backendUrl: env.config.BACKEND_URL,
    frontendUrl: env.config.FRONTEND_URL,
    viteEnv: {
      PROD: import.meta.env.PROD,
      DEV: import.meta.env.DEV,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL
    }
  });
}; 