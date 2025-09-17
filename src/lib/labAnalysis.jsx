import { supabase } from './supabase';

// Helper function to generate unique filename
const generateUniqueFilename = (file) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2);
  const fileExtension = file.name.split('.').pop().toLowerCase();
  return `${timestamp}_${randomString}.${fileExtension}`;
};

// Helper function to get file content type
const getContentType = (fileExtension) => {
  const contentTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  return contentTypes[fileExtension] || 'image/jpeg';
};

// Upload lab analysis image
export const uploadLabImage = async (file, inspectionId) => {
  try {
    // Validate file
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Only images are allowed.');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit.');
    }

    // Generate unique filename
    const filename = generateUniqueFilename(file);
    const folderPath = `inspection_${inspectionId}`;
    const filePath = `${folderPath}/${filename}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('mold-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: getContentType(file.name.split('.').pop().toLowerCase())
      });

    if (error) {
      console.error('❌ Lab image upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('mold-images')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
      filename: filename,
      size: file.size,
      type: file.type
    };

  } catch (error) {
    console.error('❌ Lab image upload error:', error);
    throw error;
  }
};

// Delete lab analysis image
export const deleteLabImage = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('mold-images')
      .remove([filePath]);

    if (error) {
      console.error('❌ Lab image delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Lab image delete error:', error);
    throw error;
  }
};

// List lab analysis images for an inspection
export const listLabImages = async (inspectionId) => {
  try {
    const folderPath = `inspection_${inspectionId}`;
    const { data, error } = await supabase.storage
      .from('mold-images')
      .list(folderPath);

    if (error) {
      console.error('❌ Lab image list error:', error);
      throw new Error(`List failed: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ Lab image list error:', error);
    throw error;
  }
};
