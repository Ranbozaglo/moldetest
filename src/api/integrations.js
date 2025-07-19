// Mock integrations for demo purposes
// In a real app, these would connect to actual services

export const Core = {
  InvokeLLM: async (prompt) => {
    // Mock LLM response
    return {
      content: `Mock response to: ${prompt}`,
      usage: { tokens: 100 }
    };
  },
  
  SendEmail: async (to, subject, body) => {
    // Mock email sending
    console.log('Mock email sent:', { to, subject, body });
    return { success: true, messageId: Date.now().toString() };
  },
  
  UploadFile: async (file) => {
    // Mock file upload
    return {
      url: `https://mock-storage.com/files/${Date.now()}_${file.name}`,
      filename: file.name
    };
  },
  
  GenerateImage: async (prompt) => {
    // Mock image generation
    return {
      url: `https://mock-image.com/generated/${Date.now()}.jpg`,
      prompt: prompt
    };
  },
  
  ExtractDataFromUploadedFile: async (file) => {
    // Mock data extraction
    return {
      extractedData: {
        text: 'Mock extracted text from file',
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






