import { supabase } from './supabase';

// Helper function to generate unique filename
const generateUniqueFilename = (file) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2);
  const fileExtension = file.name.split('.').pop().toLowerCase();
  return `${timestamp}_${randomString}.${fileExtension}`;
};

export const isLabPdfFile = (file) =>
  !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));

export const isLabImageFile = (file) =>
  !!file && typeof file.type === 'string' && file.type.startsWith('image/');

export const isAllowedLabFile = (file) => isLabPdfFile(file) || isLabImageFile(file);

export const isLabPdfUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return clean.endsWith('.pdf');
};

// Helper function to get file content type
const getContentType = (file) => {
  if (file?.type) return file.type;
  const fileExtension = file?.name?.split('.').pop()?.toLowerCase();
  const contentTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf'
  };
  return contentTypes[fileExtension] || 'application/octet-stream';
};

// Upload lab analysis file (PDF or image)
export const uploadLabImage = async (file, inspectionId) => {
  try {
    // Validate file
    if (!isAllowedLabFile(file)) {
      throw new Error('Invalid file type. Only PDF or image files are allowed.');
    }

    const maxSize = 20 * 1024 * 1024; // 20MB (PDFs can be larger than screenshots)
    if (file.size > maxSize) {
      throw new Error('File size exceeds 20MB limit.');
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
        contentType: getContentType(file)
      });

    if (error) {
      console.error('❌ Lab file upload error:', error);
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
      type: file.type || getContentType(file)
    };

  } catch (error) {
    console.error('❌ Lab file upload error:', error);
    throw error;
  }
};

// Delete lab analysis file
export const deleteLabImage = async (filePath) => {
  try {
    // Accept full public URLs as well as storage paths
    let path = filePath;
    if (typeof path === 'string' && path.includes('/storage/v1/object/public/')) {
      const parts = path.split('/storage/v1/object/public/');
      const afterBucket = parts[1] || '';
      // mold-images/... or lab-analysis/...
      path = afterBucket.replace(/^[^/]+\//, '');
    }

    const { error } = await supabase.storage
      .from('mold-images')
      .remove([path]);

    if (error) {
      console.error('❌ Lab file delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Lab file delete error:', error);
    throw error;
  }
};

// List lab analysis files for an inspection
export const listLabImages = async (inspectionId) => {
  try {
    const folderPath = `inspection_${inspectionId}`;
    const { data, error } = await supabase.storage
      .from('mold-images')
      .list(folderPath);

    if (error) {
      console.error('❌ Lab file list error:', error);
      throw new Error(`List failed: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ Lab file list error:', error);
    throw error;
  }
};

/** Intro page shown before the official lab analysis PDF pages */
export const buildLabAnalysisIntroHtml = (hasFiles = true) => {
  if (!hasFiles) {
    return `<div class="lab-analysis-section">
            <h3 class="report-section-title" style="font-size: 28px;">Laboratory Analysis Results</h3>
            <p style="color: #666; font-style: italic;">Lab analysis results have not been uploaded yet.</p>
          </div>`;
  }

  return `<div class="lab-analysis-intro" style="padding: 48px 24px; text-align: center; border-top: 2px solid #0B2E59; margin-top: 24px;">
            <h2 class="report-section-title">Laboratory Analysis Results</h2>
            <p style="color: #334155; font-size: 16px; line-height: 1.6; max-width: 520px; margin: 0 auto;">
              The following pages contain the official laboratory analysis report for this inspection.
            </p>
          </div>`;
};

/** HTML snippet for lab analysis files in generated reports.
 * PDFs render as full pages (embedded viewer) for HTML viewing.
 */
export const buildLabAnalysisFilesHtml = (fileUrls = []) => {
  if (!fileUrls || fileUrls.length === 0) {
    return '';
  }

  const filesHtml = fileUrls.map((fileUrl, index) => {
    const label = fileUrls.length > 1 ? ` ${index + 1}` : '';
    if (isLabPdfUrl(fileUrl)) {
      // No page-break-before here — intro page already starts the section
      return `<div class="lab-pdf-page" style="margin: 0; padding: 0;">
                  <iframe
                    src="${fileUrl}#toolbar=1&navpanes=0&view=FitH"
                    title="Lab Analysis PDF${label}"
                    style="width: 100%; height: 100vh; min-height: 1000px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff;"
                  ></iframe>
                </div>`;
    }

    return `<div style="margin-bottom: 20px;">
                  <img src="${fileUrl}" alt="Lab Analysis Results${label}" style="max-width: 100%; height: auto; border: 2px solid #ddd; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
                  <p style="color: #666; font-size: 14px; margin-top: 10px; font-style: italic;">Laboratory mold analysis report${fileUrls.length > 1 ? ` - Image ${index + 1}` : ''}</p>
                </div>`;
  }).join('');

  return `<div class="lab-analysis-section" style="margin: 0;">
            ${filesHtml}
          </div>`;
};

/** Normalize lab_analysis_images from API (array, JSON string, or single URL) */
export const normalizeLabAnalysisImages = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
    } catch {
      // fall through — treat as single URL
    }
    return [trimmed];
  }
  return [];
};

/** Collect lab analysis PDF URLs from an inspection */
export const getLabAnalysisPdfUrls = (fileUrls = []) =>
  normalizeLabAnalysisImages(fileUrls).filter(isLabPdfUrl);

/** Collect lab analysis image URLs (non-PDF) from an inspection */
export const getLabAnalysisImageUrls = (fileUrls = []) =>
  normalizeLabAnalysisImages(fileUrls).filter((url) => !isLabPdfUrl(url));
