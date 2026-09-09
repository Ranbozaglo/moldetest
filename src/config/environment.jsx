// Live healthy API. Prefer this whenever env points at a known-dead host.
const HEALTHY_API_BASE = 'https://moldetest-67e6.onrender.com';

// Hosts that must never be used (suspended, deleted, or placeholder).
const DEAD_API_HOSTS = new Set([
  'moldetest.onrender.com',
  'moldetest-ftxv.onrender.com',
  'your-api-host.onrender.com',
  '<your-api-host>.onrender.com',
]);

const isDeadApiHost = (hostname) => {
  if (!hostname) return true;
  const h = String(hostname).toLowerCase().trim();
  if (DEAD_API_HOSTS.has(h)) return true;
  // Catch literal placeholder strings baked into env
  if (h.includes('your-api-host')) return true;
  return false;
};

// Normalize VITE_API_BASE_URL whether it includes `/api` or not.
// Returns null for empty/invalid/dead hosts so callers can fall back.
const normalizeApiUrls = (rawUrl) => {
  const trimmed = String(rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  let parsed;
  try {
    parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (isDeadApiHost(parsed.hostname)) {
    return null;
  }

  const baseUrl = `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, '');
  // Strip a trailing /api path segment if present on the env value
  const withoutApi = baseUrl.replace(/\/api$/i, '');
  return {
    BASE_API_URL: withoutApi,
    BACKEND_URL: `${withoutApi}/api`
  };
};

const productionApiUrls = () => ({
  BASE_API_URL: HEALTHY_API_BASE,
  BACKEND_URL: `${HEALTHY_API_BASE}/api`
});

// Dynamic API URL Configuration with Environment Variable Override Support
const getApiUrls = () => {
  // Env override wins only when it is a valid, non-dead host (e.g. 67e6).
  // Stale Render env pointing at moldetest.onrender.com is ignored.
  const fromEnv = normalizeApiUrls(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) {
    return fromEnv;
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isProduction =
    import.meta.env.PROD ||
    (hostname !== 'localhost' && hostname !== '127.0.0.1');

  if (isProduction) {
    return productionApiUrls();
  }
  return {
    BASE_API_URL: 'http://localhost:5000',
    BACKEND_URL: 'http://localhost:5000/api'
  };
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
