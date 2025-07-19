// Simple data storage for demo purposes
// In a real app, this would connect to a backend API

// Mock data storage
let inspections = [];
let samples = [];
let users = [];

// Mold Inspection entity
export const MoldInspection = {
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
  
  update: async (filters, data) => {
    const index = inspections.findIndex(i => i.id === filters.id);
    if (index !== -1) {
      inspections[index] = { ...inspections[index], ...data };
      return inspections[index];
    }
    throw new Error('Inspection not found');
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