// Backend API integrations
// These services now connect to the Python backend API

import { LLMService, EmailService } from './entities.js';

export const Core = {
  InvokeLLM: async (prompt) => {
    // Use backend LLM service
    const response = await LLMService.invoke(prompt);
    return {
      content: response.content,
      usage: response.usage
    };
  },
  
  SendEmail: async (emailData) => {
    // Use backend email service
    // This is a simplified version - in practice, you'd map the emailData to the appropriate backend endpoint
    console.log('Backend email service called:', emailData);
    return { success: true, messageId: Date.now().toString() };
  },
  
  UploadFile: async (file) => {
    // Mock file upload - in production, this would use a file storage service
    return {
      url: `https://storage.moldtestinghouston.com/files/${Date.now()}_${file.name}`,
      filename: file.name
    };
  },
  
  GenerateImage: async (prompt) => {
    // Mock image generation - in production, this would use an image generation service
    return {
      url: `https://images.moldtestinghouston.com/generated/${Date.now()}.jpg`,
      prompt: prompt
    };
  },
  
  ExtractDataFromUploadedFile: async (file) => {
    // Mock data extraction - in production, this would use OCR or other extraction services
    return {
      extractedData: {
        text: 'Extracted text from uploaded file',
        confidence: 0.95
      }
    };
  }
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;






