// Utility functions for inspection management

/**
 * Get the display number for an inspection
 * @param {Object} inspection - The inspection object
 * @returns {string} The display number (TT #XXX)
 */
export function getDisplayNumber(inspection) {
  if (!inspection) return 'TT #N/A';
  
  // First try inspection_number
  if (inspection.inspection_number) {
    return `TT #${inspection.inspection_number}`;
  }
  
  // Fallback to ID
  if (inspection.id) {
    return `TT #${inspection.id.substring(0, 8)}`;
  }
  
  return 'TT #N/A';
}

/**
 * Validate inspection data
 * @param {Object} inspection - The inspection object
 * @returns {Object} Validation result
 */
export const validateInspection = (inspection) => {
  const errors = [];
  
  if (!inspection) {
    errors.push('Inspection object is null or undefined');
    return { isValid: false, errors };
  }
  
  if (!inspection.id) {
    errors.push('Inspection ID is missing');
  }
  
  if (!inspection.inspection_number) {
    errors.push('Inspection number is missing');
  }
  
  if (!inspection.email) {
    errors.push('Email is missing');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get the next inspection number
 * @param {Array} existingInspections - Array of existing inspections
 * @returns {number} The next inspection number
 */
export const getNextInspectionNumber = (existingInspections = []) => {
  if (!existingInspections || existingInspections.length === 0) {
    return 100; // Start from 100
  }
  
  const maxNumber = Math.max(...existingInspections
    .map(inspection => inspection.inspection_number || 0)
    .filter(number => number >= 100)
  );
  
  return maxNumber >= 100 ? maxNumber + 1 : 100;
};

/**
 * Format inspection for display
 * @param {Object} inspection - The inspection object
 * @returns {Object} Formatted inspection object
 */
export const formatInspectionForDisplay = (inspection) => {
  if (!inspection) return null;
  
  return {
    ...inspection,
    displayNumber: getDisplayNumber(inspection),
    isValid: validateInspection(inspection).isValid
  };
}; 