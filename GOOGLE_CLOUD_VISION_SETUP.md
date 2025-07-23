# Google Cloud Vision API Setup Guide

This guide will help you set up Google Cloud Vision API for the OCR-GPT integration system.

## Prerequisites

- Google Cloud account
- Python 3.7+ installed
- Project with billing enabled

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Note your Project ID (you'll need this later)

## Step 2: Enable the Vision API

1. In the Google Cloud Console, go to the [Vision API page](https://console.cloud.google.com/apis/library/vision.googleapis.com)
2. Click "Enable" to enable the Vision API for your project
3. Wait for the API to be enabled (this may take a few minutes)

## Step 3: Create a Service Account

1. Go to the [Service Accounts page](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Enter a name (e.g., "ocr-gpt-service")
4. Enter a description (e.g., "Service account for OCR-GPT integration")
5. Click "Create and Continue"

## Step 4: Grant Permissions

1. In the "Grant this service account access to project" section:

   - Add the role "Cloud Vision AI Service Agent"
   - Or use "Editor" for broader permissions (not recommended for production)
2. Click "Continue"
3. Click "Done"

## Step 5: Create and Download Key

1. Find your service account in the list
2. Click on the service account name
3. Go to the "Keys" tab
4. Click "Add Key" → "Create new key"
5. Select "JSON" as the key type
6. Click "Create"
7. The key file will be downloaded automatically
8. **Important**: Store this file securely and never commit it to version control

## Step 6: Set Environment Variable

### On Windows (PowerShell):
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\your\service-account-key.json"
```

### On Windows (Command Prompt):
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your\service-account-key.json
```

### On macOS/Linux:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

### Permanent Setup (add to your shell profile):
```bash
# Add this line to ~/.bashrc, ~/.zshrc, or equivalent
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

## Step 7: Install Required Packages

```bash
pip install google-cloud-vision==3.4.4 pillow==10.0.1
```

## Step 8: Test the Setup

Run the test script to verify everything is working:

```bash
python test_ocr_gpt.py
```

You should see:
- ✅ Google Cloud credentials file found
- ✅ google.cloud.vision - Google Cloud Vision API
- ✅ OCR-GPT system initialized successfully

## Step 9: Set OpenAI API Key

Don't forget to also set your OpenAI API key:

```bash
export OPENAI_API_KEY="your-openai-api-key-here"
```

## Troubleshooting

### Error: "google.auth.exceptions.DefaultCredentialsError"
- Make sure `GOOGLE_APPLICATION_CREDENTIALS` points to the correct JSON file
- Verify the file exists and is readable
- Check that the path doesn't contain spaces or special characters

### Error: "Permission denied" or "API not enabled"
- Ensure the Vision API is enabled in your Google Cloud project
- Verify your service account has the correct permissions
- Check that billing is enabled on your project

### Error: "Quota exceeded"
- Google Cloud Vision has usage limits
- Check your [quotas and limits](https://console.cloud.google.com/iam-admin/quotas)
- Consider upgrading your plan if needed

### Error: "Invalid JSON key file"
- Re-download the service account key file
- Ensure the file wasn't corrupted during download
- Verify the JSON format is valid

## Usage Examples

### Basic OCR:
```python
from ocr_gpt_integration import OCRGPTIntegration

ocr_gpt = OCRGPTIntegration()
result = ocr_gpt.process_image('path/to/image.jpg')
print(result['extracted_text'])
```

### Custom Analysis:
```python
custom_prompt = "Analyze this lab report and provide health recommendations"
result = ocr_gpt.process_image('lab_report.jpg', custom_prompt=custom_prompt)
print(result['analysis'])
```

## Security Best Practices

1. **Never commit credentials**: Add `*.json` to your `.gitignore`
2. **Use IAM roles**: In production, use IAM roles instead of service account keys
3. **Rotate keys regularly**: Create new service account keys periodically
4. **Limit permissions**: Only grant the minimum required permissions
5. **Monitor usage**: Set up billing alerts and usage monitoring

## Cost Considerations

Google Cloud Vision API pricing (as of 2024):
- First 1,000 requests per month: Free
- Additional requests: $1.50 per 1,000 requests

For detailed pricing, visit: https://cloud.google.com/vision/pricing

## Support

If you encounter issues:
1. Check the [Google Cloud Vision documentation](https://cloud.google.com/vision/docs)
2. Review the [troubleshooting guide](https://cloud.google.com/vision/docs/troubleshooting)
3. Check your project's [error reporting](https://console.cloud.google.com/errors) 