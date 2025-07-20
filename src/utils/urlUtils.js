/**
 * Utility functions for URL parameter handling
 */

/**
 * Get a URL parameter case-insensitively
 * @param {string} search - The search string (location.search)
 * @param {string} paramName - The parameter name to look for
 * @returns {string|null} The parameter value or null if not found
 */
export const getUrlParam = (search, paramName) => {
  if (!search || !paramName) return null;
  
  const params = new URLSearchParams(search);
  
  // Try exact match first
  let value = params.get(paramName);
  if (value !== null) return value;
  
  // Try case-insensitive match
  for (const [key, val] of params.entries()) {
    if (key.toLowerCase() === paramName.toLowerCase()) {
      return val;
    }
  }
  
  return null;
};

/**
 * Get inspection ID from URL parameters with fallback
 * @param {string} search - The search string (location.search)
 * @returns {string|null} The inspection ID or null if not found
 */
export const getInspectionIdFromUrl = (search) => {
  // Try multiple possible parameter names
  const possibleNames = ['inspectionId', 'inspectionid', 'id', 'inspection_id'];
  
  for (const paramName of possibleNames) {
    const value = getUrlParam(search, paramName);
    if (value && value.trim() !== '') {
      return value.trim();
    }
  }
  
  return null;
};

/**
 * Safely parse a number from URL parameter
 * @param {string} search - The search string
 * @param {string} paramName - The parameter name
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} The parsed number or default value
 */
export const getUrlParamAsNumber = (search, paramName, defaultValue = 0) => {
  const value = getUrlParam(search, paramName);
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Build URL with parameters
 * @param {string} baseUrl - The base URL
 * @param {Object} params - Parameters to add
 * @returns {string} The complete URL
 */
export const buildUrl = (baseUrl, params = {}) => {
  const url = new URL(baseUrl, window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, value.toString());
    }
  });
  
  return url.toString();
}; 