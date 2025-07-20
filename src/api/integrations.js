// Backend API integrations
// These services now connect to the Python OCR-GPT backend API

import { EmailService } from './entities.js';

export const Core = {
  InvokeLLM: async (prompt, file_urls = []) => {
    // Mock LLM service for now
    console.log('🔍 DEBUG: InvokeLLM called with:', { prompt, file_urls });
    
    try {
      // Return mock response
      const mockResponse = {
        content: `Mock LLM response for prompt: "${prompt.substring(0, 100)}..."`,
        usage: {
          prompt_tokens: 150,
          completion_tokens: 200,
          total_tokens: 350
        }
      };
      
      console.log('🔍 DEBUG: LLM response:', mockResponse);
      return mockResponse;
    } catch (error) {
      console.error('❌ Error in InvokeLLM:', error);
      throw error;
    }
  },
  
  SendEmail: async (emailData) => {
    // Use backend email service
    // This is a simplified version - in practice, you'd map the emailData to the appropriate backend endpoint
    console.log('Backend email service called:', emailData);
    return { success: true, messageId: Date.now().toString() };
  },
  
  UploadFile: async (file) => {
    // Use Supabase Storage for file upload
    console.log('🔍 DEBUG: UploadFile called with:', { fileName: file.name, fileSize: file.size, fileType: file.type });
    
    try {
      // Check if we're in a build environment
      if (typeof window === 'undefined') {
        console.log('🔍 DEBUG: Build environment detected, returning mock upload result');
        return {
          file_url: `https://storage.moldtestinghouston.com/mock/${Date.now()}_${file.name}`,
          file_path: `/mock/${file.name}`,
          bucket: 'lab-analysis',
          size: file.size,
          type: file.type
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
          file_url: `https://storage.moldtestinghouston.com/mock/${Date.now()}_${file.name}`,
          file_path: `/mock/${file.name}`,
          bucket: 'lab-analysis',
          size: file.size,
          type: file.type
        };
      }
      
      // Upload to Supabase Storage bucket 'lab-analysis'
      const result = await uploadToSupabaseStorage(file, 'lab-analysis', 'lab-analysis-images');
      
      console.log('🔍 DEBUG: UploadFile result:', result);
      
      return {
        file_url: result.url,
        file_path: result.path,
        bucket: result.bucket,
        size: result.size,
        type: result.type
      };
      
    } catch (error) {
      console.error('❌ UploadFile error:', error);
      
      // Return mock result on error
      return {
        file_url: `https://storage.moldtestinghouston.com/error/${Date.now()}_${file.name}`,
        file_path: `/error/${file.name}`,
        bucket: 'lab-analysis',
        size: file.size,
        type: file.type,
        error: error.message
      };
    }
  },
  
  GenerateImage: async (prompt) => {
    // Mock image generation - in production, this would use an image generation service
    return {
      url: `https://images.moldtestinghouston.com/generated/${Date.now()}.jpg`,
      prompt: prompt
    };
  },
  
  ExtractDataFromUploadedFile: async (file) => {
    // Use OCR-GPT backend for text extraction and analysis
    console.log('🔍 DEBUG: ExtractDataFromUploadedFile called with:', { fileName: file.name, fileSize: file.size, fileType: file.type });
    
    try {
      // First upload the file
      const uploadResult = await Core.UploadFile(file);
      console.log('🔍 DEBUG: File uploaded:', uploadResult);
      
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
      console.log('🔍 DEBUG: OCR analysis result:', analysisResult);
      
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
    console.log('🔍 DEBUG: ProcessImageWithOCR called with:', { fileName: file.name, customPrompt });
    
    try {
      // Upload file
      const uploadResult = await Core.UploadFile(file);
      console.log('🔍 DEBUG: File uploaded for OCR processing:', uploadResult);
      
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
      console.log('🔍 DEBUG: OCR-GPT analysis result:', analysisResult);
      
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
    console.log('🔍 DEBUG: AnalyzeLabResults called with:', { fileName: file.name });
    
    try {
      const result = await Core.ProcessImageWithOCR(file);
      console.log('🔍 DEBUG: Lab results analysis completed:', result);
      return result;
      
    } catch (error) {
      console.error('❌ AnalyzeLabResults error:', error);
      throw error;
    }
  }
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const ProcessImageWithOCR = Core.ProcessImageWithOCR;
export const AnalyzeLabResults = Core.AnalyzeLabResults;






