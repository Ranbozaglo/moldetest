import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL environment variable is required but not set. Please check your .env file.');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_ANON_KEY environment variable is required but not set. Please check your .env file.');
}

// Create Supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper function to get the current user's session (Flask auth)
export const getCurrentSession = async () => {
  try {
    const savedUser = localStorage.getItem('mth_user');
    if (!savedUser) {
      console.log('No Flask auth session found');
      return null;
    }
    
    const userData = JSON.parse(savedUser);
    if (!userData.access_token) {
      console.log('No access token in Flask auth session');
      return null;
    }
    
    // Return Flask session format compatible with expected usage
    return {
      access_token: userData.access_token,
      user: userData
    };
  } catch (error) {
    console.error('Error getting Flask auth session:', error);
    return null;
  }
};

// Helper function to get the current user (Flask auth)
export const getCurrentUser = async () => {
  try {
    const savedUser = localStorage.getItem('mth_user');
    if (!savedUser) {
      console.log('No Flask auth user found');
      return null;
    }
    
    const userData = JSON.parse(savedUser);
    return userData;
  } catch (error) {
    console.error('Error getting Flask auth user:', error);
    return null;
  }
};

// Helper function to upload file to Supabase Storage
export const uploadToSupabaseStorage = async (file, bucketName, folder = '') => {
  try {
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
      fileType: file.type,
      folder: folder
    });

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
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
    const { data: urlData } = supabase.storage
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
    console.log('🔍 DEBUG: Deleting from Supabase Storage:', {
      bucket: bucketName,
      filePath: filePath
    });

    const { error } = await supabase.storage
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
    const { data, error } = await supabase.storage
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