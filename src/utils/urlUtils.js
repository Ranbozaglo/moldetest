/**
 * Enhanced URL utility functions for parameter handling
 */

/**
 * Get a URL parameter with comprehensive fallback options
 * @param {string} search - The search string (location.search)
 * @param {string} paramName - The parameter name to look for
 * @param {string} defaultValue - Default value if parameter not found
 * @returns {string|null} The parameter value or default/null if not found
 */
export const getUrlParam = (search, paramName, defaultValue = null) => {
  if (!search || !paramName) {
    console.warn('getUrlParam: Invalid search or paramName:', { search, paramName });
    return defaultValue;
  }
  
  try {
    const params = new URLSearchParams(search);
    
    // Try exact match first
    let value = params.get(paramName);
    if (value !== null && value.trim() !== '') {
      return value.trim();
    }
    
    // Try case-insensitive match
    for (const [key, val] of params.entries()) {
      if (key.toLowerCase() === paramName.toLowerCase()) {
        const trimmedVal = val.trim();
        if (trimmedVal !== '') {
          return trimmedVal;
        }
      }
    }
    
    return defaultValue;
  } catch (error) {
    console.error('getUrlParam: Error parsing URL parameters:', error);
    return defaultValue;
  }
};

/**
 * Get inspection ID from URL parameters with comprehensive fallback
 * @param {string} search - The search string (location.search)
 * @returns {string|null} The inspection ID or null if not found
 */
export const getInspectionIdFromUrl = (search) => {
  // Try multiple possible parameter names in order of preference
  const possibleNames = ['inspectionId', 'id', 'inspectionid', 'inspection_id', 'inspectionID'];
  
  console.log('🔍 DEBUG: getInspectionIdFromUrl - searching in:', search);
  
  for (const paramName of possibleNames) {
    const value = getUrlParam(search, paramName);
    if (value && value.trim() !== '') {
      const trimmedValue = value.trim();
      console.log(`🔍 DEBUG: Found inspection ID '${trimmedValue}' using parameter '${paramName}'`);
      
      // Basic validation - should be alphanumeric
      if (/^[a-zA-Z0-9\-_]+$/.test(trimmedValue)) {
        return trimmedValue;
      } else {
        console.warn('getInspectionIdFromUrl: Invalid inspection ID format:', trimmedValue);
      }
    }
  }
  
  console.warn('getInspectionIdFromUrl: No valid inspection ID found in URL parameters');
  return null;
};

/**
 * Safely parse a number from URL parameter with validation
 * @param {string} search - The search string
 * @param {string} paramName - The parameter name
 * @param {number} defaultValue - Default value if parsing fails
 * @param {Object} options - Additional options for validation
 * @returns {number} The parsed number or default value
 */
export const getUrlParamAsNumber = (search, paramName, defaultValue = 0, options = {}) => {
  const { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = options;
  
  const value = getUrlParam(search, paramName);
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn('getUrlParamAsNumber: Failed to parse as number:', value);
    return defaultValue;
  }
  
  // Validate range if specified
  if (parsed < min || parsed > max) {
    console.warn('getUrlParamAsNumber: Number out of range:', { parsed, min, max });
    return defaultValue;
  }
  
  return parsed;
};

/**
 * Build URL with parameters and proper validation
 * @param {string} baseUrl - The base URL
 * @param {Object} params - Parameters to add
 * @param {Object} options - Additional options
 * @returns {string} The complete URL
 */
export const buildUrl = (baseUrl, params = {}, options = {}) => {
  const { removeEmpty = true, encodeValues = true } = options;
  
  try {
    const url = new URL(baseUrl, window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        const stringValue = value.toString();
        
        // Skip empty values if removeEmpty is true
        if (removeEmpty && stringValue.trim() === '') {
          return;
        }
        
        // Set the parameter
        url.searchParams.set(key, encodeValues ? stringValue : stringValue);
      }
    });
    
    return url.toString();
  } catch (error) {
    console.error('buildUrl: Error building URL:', error);
    return baseUrl; // Return base URL as fallback
  }
};

/**
 * Get all URL parameters as an object
 * @param {string} search - The search string
 * @returns {Object} All parameters as key-value pairs
 */
export const getAllUrlParams = (search) => {
  const params = {};
  
  if (!search) return params;
  
  try {
    const urlParams = new URLSearchParams(search);
    
    for (const [key, value] of urlParams.entries()) {
      params[key] = value.trim();
    }
    
    return params;
  } catch (error) {
    console.error('getAllUrlParams: Error parsing parameters:', error);
    return params;
  }
};

/**
 * Validate URL parameter format for security
 * @param {string} value - The parameter value to validate
 * @param {string} type - The expected type ('id', 'email', 'number', etc.)
 * @returns {boolean} Whether the value is valid
 */
export const validateUrlParam = (value, type = 'string') => {
  if (!value || typeof value !== 'string') return false;
  
  const trimmedValue = value.trim();
  if (!trimmedValue) return false;
  
  switch (type) {
    case 'id':
      return /^[a-zA-Z0-9\-_]+$/.test(trimmedValue) && trimmedValue.length <= 50;
    
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue) && trimmedValue.length <= 255;
    
    case 'number':
      return /^-?\d+$/.test(trimmedValue);
    
    case 'alphanumeric':
      return /^[a-zA-Z0-9]+$/.test(trimmedValue);
    
    case 'string':
    default:
      return trimmedValue.length <= 1000; // Basic length check
  }
}; 