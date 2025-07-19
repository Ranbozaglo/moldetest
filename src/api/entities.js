// Simple data storage for demo purposes
// In a real app, this would connect to a backend API

// Mock data storage
let inspections = [];
let samples = [];
let users = [];

// Mold Inspection entity
export const MoldInspection = {
  // Debug method to check if the object is properly exported
  debug: () => {
    console.log("🔍 DEBUG: MoldInspection object is available");
    console.log("🔍 DEBUG: MoldInspection methods:", Object.keys(MoldInspection));
    return true;
  },
  create: async (data) => {
    const inspection = {
      id: Date.now().toString(),
      ...data,
      created_date: new Date().toISOString(),
      status: 'pending'
    };
    inspections.push(inspection);
    return inspection;
  },
  
  findMany: async (filters = {}) => {
    let filtered = [...inspections];
    
    if (filters.user_id) {
      filtered = filtered.filter(i => i.user_id === filters.user_id);
    }
    
    return filtered;
  },
  
  findUnique: async (filters) => {
    return inspections.find(i => i.id === filters.id);
  },
  
  update: async (idOrFilters, data) => {
    let id;
    if (typeof idOrFilters === 'string') {
      id = idOrFilters;
    } else {
      id = idOrFilters.id;
    }
    
    const index = inspections.findIndex(i => i.id === id);
    if (index !== -1) {
      inspections[index] = { ...inspections[index], ...data };
      return inspections[index];
    }
    throw new Error('Inspection not found');
  },
  
  list: async (sortBy = '-created_date', limit = 10) => {
    console.log("🔍 DEBUG: MoldInspection.list called with:", { sortBy, limit });
    let sorted = [...inspections];
    
    // Sort by the specified field
    if (sortBy && sortBy.startsWith('-')) {
      const field = sortBy.substring(1);
      sorted.sort((a, b) => {
        if (a[field] && b[field]) {
          // Handle numeric fields
          if (typeof a[field] === 'number' && typeof b[field] === 'number') {
            return b[field] - a[field]; // Descending
          }
          // Handle string fields
          if (typeof a[field] === 'string' && typeof b[field] === 'string') {
            return b[field].localeCompare(a[field]); // Descending
          }
          // Handle date fields
          if (a[field] instanceof Date && b[field] instanceof Date) {
            return b[field] - a[field]; // Descending
          }
          // Handle ISO date strings
          if (typeof a[field] === 'string' && typeof b[field] === 'string' && 
              a[field].includes('-') && b[field].includes('-')) {
            return new Date(b[field]) - new Date(a[field]); // Descending
          }
        }
        return 0;
      });
    } else if (sortBy) {
      sorted.sort((a, b) => {
        if (a[sortBy] && b[sortBy]) {
          // Handle numeric fields
          if (typeof a[sortBy] === 'number' && typeof b[sortBy] === 'number') {
            return a[sortBy] - b[sortBy]; // Ascending
          }
          // Handle string fields
          if (typeof a[sortBy] === 'string' && typeof b[sortBy] === 'string') {
            return a[sortBy].localeCompare(b[sortBy]); // Ascending
          }
          // Handle date fields
          if (a[sortBy] instanceof Date && b[sortBy] instanceof Date) {
            return a[sortBy] - b[sortBy]; // Ascending
          }
          // Handle ISO date strings
          if (typeof a[sortBy] === 'string' && typeof b[sortBy] === 'string' && 
              a[sortBy].includes('-') && b[sortBy].includes('-')) {
            return new Date(a[sortBy]) - new Date(b[sortBy]); // Ascending
          }
        }
        return 0;
      });
    }
    
    // Apply limit
    const result = sorted.slice(0, limit);
    console.log("🔍 DEBUG: MoldInspection.list returning:", result);
    return result;
  },
  
  filter: async (filters = {}, sortBy = '-created_date', limit = 10) => {
    let filtered = [...inspections];
    
    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        if (Array.isArray(filters[key])) {
          // Handle array filters (like status: ['pending', 'in_progress'])
          filtered = filtered.filter(item => 
            filters[key].includes(item[key])
          );
        } else {
          // Handle single value filters
          filtered = filtered.filter(item => 
            item[key] === filters[key]
          );
        }
      }
    });
    
    // Sort by the specified field
    if (sortBy.startsWith('-')) {
      const field = sortBy.substring(1);
      filtered.sort((a, b) => {
        if (a[field] && b[field]) {
          return b[field] - a[field]; // Descending
        }
        return 0;
      });
    } else {
      filtered.sort((a, b) => {
        if (a[sortBy] && b[sortBy]) {
          return a[sortBy] - b[sortBy]; // Ascending
        }
        return 0;
      });
    }
    
    // Apply limit
    return filtered.slice(0, limit);
  }
};

// Sample entity
export const Sample = {
  create: async (data) => {
    const sample = {
      id: Date.now().toString(),
      ...data,
      created_date: new Date().toISOString()
    };
    samples.push(sample);
    return sample;
  },
  
  findMany: async (filters = {}) => {
    let filtered = [...samples];
    
    if (filters.inspection_id) {
      filtered = filtered.filter(s => s.inspection_id === filters.inspection_id);
    }
    
    return filtered;
  },
  
  bulkCreate: async (dataArray) => {
    const createdSamples = [];
    for (const data of dataArray) {
      const sample = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        ...data,
        created_date: new Date().toISOString()
      };
      samples.push(sample);
      createdSamples.push(sample);
    }
    return createdSamples;
  }
};

// User entity for authentication
export const User = {
  me: async () => {
    const savedUser = localStorage.getItem('mth_user');
    if (savedUser) {
      return JSON.parse(savedUser);
    }
    throw new Error('No user found');
  }
};

// Default export for backward compatibility
export default {
  MoldInspection,
  Sample,
  User
};