# OCR Setup Guide for Lab Analysis

## 🎯 Overview

The backend now supports **real Google Cloud Vision OCR** for analyzing lab test images. When properly configured, uploaded lab images will be:

1. **Processed by Google Cloud Vision** - Extract text from lab reports  
2. **Analyzed by GPT-4** - Professional mold analysis based on extracted text
3. **Returned as detailed reports** - Comprehensive lab analysis with recommendations

## 📋 Prerequisites

- Google Cloud account with billing enabled
- OpenAI account with API access
- Backend `.env` file configuration

## 🔧 Step 1: Create .env File

Create `backend/.env` with the following content:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Backend Configuration (Required)
SECRET_KEY=your_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google Cloud Vision OCR (Optional - for real OCR)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/google-service-account.json

# OpenAI Configuration (Optional - for GPT analysis)
OPENAI_API_KEY=your_openai_api_key_here

# Google Cloud Project (Optional)
GOOGLE_CLOUD_PROJECT=your_project_id_here
```

## 🌐 Step 2: Setup Google Cloud Vision

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable billing for the project

### 2.2 Enable Vision API
1. Go to [Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
2. Click **"Enable"** 
3. Wait for activation (2-3 minutes)

### 2.3 Create Service Account
1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **"Create Service Account"**
3. Name: `mold-ocr-service`
4. Description: `OCR service for mold lab analysis`
5. Click **"Create and Continue"**

### 2.4 Grant Permissions
1. Add role: **"Cloud Vision AI Service Agent"**
2. Click **"Continue"** → **"Done"**

### 2.5 Download Credentials
1. Click on your service account name
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **"JSON"** format
5. Download and save the JSON file securely
6. Update `.env` file with the path to this JSON file

## 🤖 Step 3: Setup OpenAI

### 3.1 Get API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Copy the API key
4. Add to `.env` file: `OPENAI_API_KEY=your_key_here`

### 3.2 Verify Credits
- Ensure you have OpenAI credits for GPT-4 usage
- Lab analysis uses GPT-4 for best results

## ✅ Step 4: Test Configuration

### 4.1 Start Backend
```bash
cd backend
python simple_main.py
```

### 4.2 Check Startup Messages
Look for these messages:

✅ **OCR Working:**
```
✅ Google Cloud credentials file found
✅ OpenAI API key configured  
✅ OCR configuration validated - Real Google Vision OCR available
🎯 Real Google Cloud Vision OCR will be used for lab analysis
🔬 OCR Status: Real Google Cloud Vision
```

❌ **OCR Not Working:**
```
⚠️ GOOGLE_APPLICATION_CREDENTIALS not configured
⚠️ OPENAI_API_KEY not configured
⚠️ OCR configuration incomplete - Using mock responses
🔬 OCR Status: Mock responses - Add .env credentials
```

### 4.3 Test API Endpoint
```bash
curl -X POST https://moldetest.onrender.com/api/ocr-gpt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze these lab results",
    "image_urls": ["https://example.com/lab-image.jpg"]
  }'
```

**Expected Response (OCR Working):**
```json
{
  "content": "**LABORATORY ANALYSIS SUMMARY**...",
  "analysis": "Based on the laboratory analysis...",
  "extracted_text": "Lab Report\nSample ID: 12345...",
  "model": "gpt-4-vision-ocr",
  "images_processed": 1,
  "ocr_available": true
}
```

## 🚨 Troubleshooting

### Issue: "OCR service not available"
- Check `.env` file exists in `backend/` directory
- Verify `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Ensure JSON credentials file exists and is readable

### Issue: "Google Vision API error"
- Verify Vision API is enabled in Google Cloud
- Check service account has correct permissions
- Ensure billing is enabled for the Google Cloud project

### Issue: "OpenAI API error"
- Verify `OPENAI_API_KEY` is correct
- Check OpenAI account has credits
- Ensure API key has GPT-4 access

### Issue: "No text extracted"
- Check image quality and resolution
- Ensure images contain readable text
- Try with different image formats (JPG, PNG)

## 💡 Usage Tips

1. **Image Quality:** Use high-resolution, clear lab report images
2. **Format Support:** JPG, PNG, GIF, BMP, WebP formats supported
3. **Languages:** Supports English and Hebrew text extraction
4. **Size Limits:** Images should be under 10MB
5. **Cost:** Google Vision charges per 1000 image units (~$1.50)

## 🔄 Fallback Behavior

**Without OCR credentials:** System provides professional mock analysis
**With OCR credentials:** Real text extraction + GPT-4 analysis

The system gracefully handles missing credentials and provides useful responses in all cases. 