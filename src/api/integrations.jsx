// Backend API integrations
// These services now connect to the Python OCR-GPT backend API

import { EmailService } from './entities.jsx';
import { getBaseApiUrl } from '@/config/environment.jsx';

// WebP conversion utility
const convertToWebP = async (file) => {
  return new Promise((resolve, reject) => {
    // Create canvas for image conversion
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0);
      
      // Convert to WebP
      canvas.toBlob((blob) => {
        if (blob) {
          // Create new file with WebP extension
          const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
            type: 'image/webp',
            lastModified: Date.now()
          });
          resolve(webpFile);
        } else {
          reject(new Error('Failed to convert image to WebP'));
        }
      }, 'image/webp', 0.85); // 85% quality for good balance
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for conversion'));
    };
    
    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export const Core = {
  InvokeLLM: async (prompt, imageUrls = [], inspectionId = null) => {
    try {
      // Check if we're in a build environment
      if (typeof window === 'undefined') {
        return {
          content: `Mock LLM response for prompt: "${prompt.substring(0, 100)}..."`,
          usage: {
            prompt_tokens: 150,
            completion_tokens: 200,
            total_tokens: 350
          }
        };
      }

      // Connect to the OCR-GPT backend API using dynamic configuration
      const baseApiUrl = getBaseApiUrl();
      const apiUrl = `${baseApiUrl}/api/ocr-gpt`;

      // Send the extracted text under the correct field
      const requestData = {
        extracted_text: prompt,
        inspection_id: inspectionId
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ CORE API: HTTP error response body:', errorText);
        throw new Error(`OCR-GPT API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      return {
        content: result.analysis || result.content || result.response || 'No analysis content received',
        usage: result.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
      
    } catch (error) {
      console.error('❌ Error in InvokeLLM:', error);
      
      // Return mock response if backend is not available
      console.warn('⚠️ OCR-GPT backend not available, using mock response');
      return {
        content: `Mock OCR analysis for lab results. Please review the uploaded images manually and add professional conclusions and recommendations based on the laboratory findings.`,
        usage: {
          prompt_tokens: 150,
          completion_tokens: 200,
          total_tokens: 350
        }
      };
    }
  },
  
  SendEmail: async (emailData) => {
    // Use backend email service
    // This is a simplified version - in practice, you'd map the emailData to the appropriate backend endpoint
    return { success: true, messageId: Date.now().toString() };
  },
  
  UploadFile: async (file, bucketType = 'inspection') => {
    try {
      // Check if file is an image and convert to WebP if needed
      let uploadFile = file;
      if (file.type.startsWith('image/') && !file.type.includes('webp')) {
        try {
          uploadFile = await convertToWebP(file);
        } catch (conversionError) {
          console.warn('⚠️ WebP conversion failed, using original file:', conversionError);
          uploadFile = file; // Fallback to original file
        }
      }
      
      // Check if we're in a build environment
      if (typeof window === 'undefined') {
        return {
          file_url: `https://storage.moldtestinghouston.com/mock/${Date.now()}_${uploadFile.name}`,
          file_path: `/mock/${uploadFile.name}`,
          bucket: bucketType === 'lab-analysis' ? 'lab-analysis' : 'mold-images',
          size: uploadFile.size,
          type: uploadFile.type
        };
      }
      
      // Import the Supabase upload function only in browser environment
      let uploadToSupabaseStorage;
      try {
        const supabaseModule = await import('@/lib/supabase.js');
        uploadToSupabaseStorage = supabaseModule.uploadToSupabaseStorage;
      } catch (importError) {
        console.warn('⚠️ Supabase module not available, using mock upload:', importError);
        return {
          file_url: `https://storage.moldtestinghouston.com/mock/${Date.now()}_${uploadFile.name}`,
          file_path: `/mock/${uploadFile.name}`,
          bucket: bucketType === 'lab-analysis' ? 'lab-analysis' : 'mold-images',
          size: uploadFile.size,
          type: uploadFile.type
        };
      }
      
      // Set default bucket and folder
      const bucketName = 'mold-images';
      const folderName = 'mold-inspections';

      // Upload to Supabase Storage
      const result = await uploadToSupabaseStorage(uploadFile, bucketName, folderName);

      // Validate the upload result
      if (!result.url && !result.file_url) {
        throw new Error('Upload failed: No public URL returned from Supabase Storage');
      }
      
      return {
        file_url: result.url || result.file_url,
        file_path: result.path,
        bucket: result.bucket || bucketName,
        size: result.size,
        type: result.type
      };
      
    } catch (error) {
      console.error('❌ UploadFile error:', error);
      
      // Provide specific guidance for authentication errors
      if (error.message && error.message.includes('Authentication required')) {
        throw new Error('Please log in to upload files. If you are already logged in, try refreshing the page or logging out and back in.');
      }
      
      // Return mock result on other errors
      return {
        file_url: `https://storage.moldtestinghouston.com/error/${Date.now()}_${file.name}`,
        file_path: `/error/${file.name}`,
        bucket: bucketType === 'lab-analysis' ? 'lab-analysis' : 'mold-images',
        size: file.size,
        type: file.type,
        error: error.message
      };
    }
  },
  
  // Specialized upload functions for different image types
  UploadInspectionImage: async (file) => {
    return await Core.UploadFile(file, 'inspection');
  },
  
  // Lab analysis image upload is now handled by the regular UploadFile function
  
  GenerateImage: async (prompt) => {
    // Mock image generation - in production, this would use an image generation service
    return {
      url: `https://images.moldtestinghouston.com/generated/${Date.now()}.jpg`,
      prompt: prompt
    };
  },
  
  ExtractDataFromUploadedFile: async (file) => {
    // Use OCR-GPT backend for text extraction and analysis
    try {
      // First upload the file
      const uploadResult = await Core.UploadFile(file);

      // Then use OCR-GPT backend to extract and analyze text
      const ocrPrompt = `
Analyze this image and extract all text content. Provide a comprehensive analysis including:

1. **Extracted Text**: All text found in the image
2. **Content Summary**: Brief summary of the content
3. **Document Type**: What type of document this appears to be
4. **Key Information**: Important points or data found
5. **Language Detection**: Identify languages present
6. **Quality Assessment**: How well the text was extracted

Please provide a structured, professional analysis.
`;

      const analysisResult = await Core.InvokeLLM(ocrPrompt, [uploadResult.file_url]);

      return {
        extractedData: {
          text: analysisResult.content,
          confidence: 0.95,
          file_url: uploadResult.file_url,
          analysis: analysisResult.content
        }
      };
      
    } catch (error) {
      console.error('❌ ExtractDataFromUploadedFile error:', error);
      throw error;
    }
  },
  
  // New OCR-GPT specific methods
  ProcessImageWithOCR: async (file, customPrompt = null) => {
    try {
      // Upload file
      const uploadResult = await Core.UploadFile(file);

      // Default prompt for OCR analysis
      const defaultPrompt = `
Analyze this laboratory mold analysis report image and provide professional conclusions and recommendations.

Context:
- This is a mold inspection and testing report
- Focus on health and safety implications
- Provide actionable recommendations

Please analyze the lab results shown in this image and provide:

1. **CONCLUSION** (2-3 paragraphs):
   - Summarize the lab findings
   - Assess the mold levels and types found
   - Evaluate health and safety implications
   - Compare to normal/acceptable levels

2. **RECOMMENDATIONS** (detailed list):
   - Immediate actions needed (if any)
   - Preventive measures
   - Professional services recommended
   - Timeline for any required actions
   - Environmental controls to implement

Make the analysis professional, specific, and actionable. Focus on practical guidance for the property owner.

Return your response in this exact JSON format:
{
  "conclusion": "Your detailed conclusion here...",
  "recommendations": "Your detailed recommendations here..."
}
`;

      const prompt = customPrompt || defaultPrompt;

      // Process with OCR-GPT backend
      const analysisResult = await Core.InvokeLLM(prompt, [uploadResult.file_url]);

      return {
        success: true,
        file_url: uploadResult.file_url,
        extracted_text: analysisResult.content,
        analysis: analysisResult.content,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ ProcessImageWithOCR error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },
  
  AnalyzeLabResults: async (file) => {
    try {
      const result = await Core.ProcessImageWithOCR(file);
      return result;

    } catch (error) {
      console.error('❌ AnalyzeLabResults error:', error);
      throw error;
    }
  },

  ProcessLabImageWithOCR: async (file) => {
    try {
      // Check if we're in a build environment
      if (typeof window === 'undefined') {
        return {
          valid: false,
          extracted_text: "",
          confidence: "unknown",
          error: "Build environment detected",
          message: "OCR processing not available in build environment. Manual review required."
        };
      }

      const baseApiUrl = getBaseApiUrl();
      const apiUrl = `${baseApiUrl}/api/validate-lab-image-file`;

      // Create FormData to send file
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData // Don't set Content-Type header - let browser set it with boundary
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ PROCESS OCR: HTTP error response:', errorText);
        throw new Error(`OCR processing API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      return result;

    } catch (error) {
      console.error('❌ ProcessLabImageWithOCR error:', error);
      
      // Return structured error response instead of throwing
      return {
        valid: false,
        extracted_text: "",
        confidence: "unknown",
        error: error.message,
        message: `Google Vision API call failed: ${error.message}. Manual review required.`
      };
    }
  },

  ValidateLabImageFile: async (file) => {
    try {
      // Check if we're in a build environment
      if (typeof window === 'undefined') {
        return {
          valid: false,
          extracted_text: "",
          confidence: "unknown",
          error: "Build environment detected", 
          message: "File validation not available in build environment. Manual review required."
        };
      }

      const baseApiUrl = getBaseApiUrl();
      const apiUrl = `${baseApiUrl}/api/validate-lab-image-file`;

      // Create FormData to send file
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData // Don't set Content-Type header - let browser set it with boundary
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ VALIDATE FILE: HTTP error response:', errorText);
        throw new Error(`File validation API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      return result;

    } catch (error) {
      console.error('❌ ValidateLabImageFile error:', error);
      
      // Return structured error response instead of throwing
      return {
        valid: false,
        extracted_text: "",
        confidence: "unknown", 
        error: error.message,
        message: `Google Vision API call failed: ${error.message}. Manual review required.`
      };
    }
  },

  ValidateLabImage: async (imageUrl) => {
    try {
      // Check if we're in a build environment
      if (typeof window === 'undefined') {
        return {
          valid: false,
          extracted_text: "",
          confidence: "unknown",
          error: "Build environment detected",
          message: "Image validation not available in build environment. Manual review required."
        };
      }

      const baseApiUrl = getBaseApiUrl();
      const apiUrl = `${baseApiUrl}/api/validate-lab-image`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ VALIDATE: HTTP error response:', errorText);
        throw new Error(`Validation API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      return result;

    } catch (error) {
      console.error('❌ ValidateLabImage error:', error);
      
      // Return structured error response instead of throwing
      return {
        valid: false,
        extracted_text: "",
        confidence: "unknown",
        error: error.message, 
        message: `Google Vision API call failed: ${error.message}. Manual review required.`
      };
    }
  },

  /**
   * Admin AI Report Assistant — draft conclusion + recommendations from findings text.
   * Calls the Flask backend endpoint. Does not persist; caller updates local form state only.
   */
  GenerateReportAssistant: async ({ findingsText, inspectionId, customerSubmitted = null }) => {
    if (typeof window === 'undefined') {
      throw new Error('Report assistant is not available during build');
    }

    const trimmed = (findingsText || '').trim();
    if (!trimmed) {
      throw new Error('Enter laboratory findings before generating.');
    }

    const MAX_FINDINGS_CHARS = 8000;
    if (trimmed.length > MAX_FINDINGS_CHARS) {
      throw new Error(`Laboratory findings must be ${MAX_FINDINGS_CHARS} characters or fewer.`);
    }

    if (!inspectionId) {
      throw new Error('Missing inspection id.');
    }

    let accessToken = null;
    try {
      const savedUser = localStorage.getItem('mth_user');
      if (savedUser) {
        accessToken = JSON.parse(savedUser)?.access_token || null;
      }
    } catch {
      accessToken = null;
    }

    if (!accessToken) {
      throw new Error('Please sign in as an admin to use the AI Report Assistant.');
    }

    const baseApiUrl = import.meta.env.VITE_AI_API_BASE_URL || getBaseApiUrl();
    const assistantUrl = `${baseApiUrl.replace(/\/$/, '')}/api/generate-report-assistant`;

    let response;
    try {
      response = await fetch(assistantUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          findings_text: trimmed,
          inspection_id: inspectionId,
          customer_submitted: customerSubmitted || undefined,
        }),
      });
    } catch (networkError) {
      console.error('❌ GenerateReportAssistant network error:', networkError);
      throw new Error(
        'Could not reach the local/Flask AI API. Start the backend (python simple_main.py in /backend) and keep VITE_AI_API_BASE_URL=http://localhost:5000.'
      );
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        (payload && (payload.error || payload.message)) ||
        (response.status === 404
          ? 'AI endpoint not found on the API server. Confirm the backend with /api/generate-report-assistant is running.'
          : `AI generation failed (${response.status})`);
      throw new Error(message);
    }

    const conclusion = typeof payload?.conclusion === 'string' ? payload.conclusion.trim() : '';
    const recommendations =
      typeof payload?.recommendations === 'string' ? payload.recommendations.trim() : '';
    const moldFindings = Array.isArray(payload?.mold_findings) ? payload.mold_findings : [];

    if (!conclusion || !recommendations) {
      throw new Error('AI returned an incomplete response. Please try again.');
    }

    return { conclusion, recommendations, moldFindings };
  },
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const UploadInspectionImage = Core.UploadInspectionImage;
export const UploadLabAnalysisImage = Core.UploadLabAnalysisImage;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const ProcessImageWithOCR = Core.ProcessImageWithOCR;
export const ProcessLabImageWithOCR = Core.ProcessLabImageWithOCR;
export const AnalyzeLabResults = Core.AnalyzeLabResults;
export const ValidateLabImageFile = Core.ValidateLabImageFile;
export const ValidateLabImage = Core.ValidateLabImage;
export const GenerateReportAssistant = Core.GenerateReportAssistant;






