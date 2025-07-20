import { createClient } from '@supabase/supabase-js';

// Safe environment config that works during build
const getSafeEnvironmentConfig = async () => {
  try {
    const { getEnvironmentConfig } = await import('@/config/environment.js');
    return getEnvironmentConfig();
  } catch (error) {
    console.warn('⚠️ Environment config not available during build, using defaults');
    return {
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://qtrypzzcjebvfcihiynt.supabase.co',
      SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cnlwempjamVidmZjaWhpeW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzAsImV4cCI6MjA1MDU0ODk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
    };
  }
};

// Initialize Supabase client with build-time safety
let supabase = null;

const initializeSupabase = async () => {
  if (supabase) return supabase;
  
  try {
    const config = await getSafeEnvironmentConfig();
    
    supabase = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );
    
    return supabase;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    return null;
  }
};

// Export a function to get the Supabase client
export const getSupabaseClient = async () => {
  return await initializeSupabase();
};

// Helper function to get the current user's session
export const getCurrentSession = async () => {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      console.warn('⚠️ Supabase client not available');
      return null;
    }
    
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

// Helper function to get the current user
export const getCurrentUser = async () => {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      console.warn('⚠️ Supabase client not available');
      return null;
    }
    
    const { data: { user }, error } = await client.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Helper function to upload file to Supabase Storage
export const uploadToSupabaseStorage = async (file, bucketName, folder = '') => {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }
    
    // Check for custom authentication instead of Supabase session
    const savedUser = localStorage.getItem('mth_user');
    if (!savedUser) {
      throw new Error('Authentication required. Please log in to upload files. If you are already logged in, try refreshing the page.');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${folder}/${timestamp}_${Math.random().toString(36).substring(2)}.${fileExtension}`;

    console.log('🔍 DEBUG: Uploading to Supabase Storage:', {
      bucket: bucketName,
      fileName: fileName,
      fileSize: file.size,
      fileType: file.type
    });

    // Upload file to Supabase Storage
    const { data, error } = await client.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('✅ Supabase upload successful:', data);

    // Get public URL
    const { data: urlData } = client.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log('🔍 DEBUG: Public URL:', publicUrl);

    return {
      url: publicUrl,
      path: fileName,
      bucket: bucketName,
      size: file.size,
      type: file.type
    };

  } catch (error) {
    console.error('❌ Error uploading to Supabase Storage:', error);
    throw error;
  }
};

// Helper function to delete file from Supabase Storage
export const deleteFromSupabaseStorage = async (filePath, bucketName) => {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }
    
    console.log('🔍 DEBUG: Deleting from Supabase Storage:', {
      bucket: bucketName,
      filePath: filePath
    });

    const { error } = await client.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('❌ Supabase delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    console.log('✅ Supabase delete successful');
    return true;

  } catch (error) {
    console.error('❌ Error deleting from Supabase Storage:', error);
    throw error;
  }
};

// Helper function to list files in a bucket
export const listSupabaseStorageFiles = async (bucketName, folder = '') => {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }
    
    const { data, error } = await client.storage
      .from(bucketName)
      .list(folder);

    if (error) {
      console.error('❌ Supabase list error:', error);
      throw new Error(`List failed: ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Error listing Supabase Storage files:', error);
    throw error;
  }
}; 