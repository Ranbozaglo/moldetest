# OCR-GPT Integration System

A Python-based system that integrates Tesseract OCR with OpenAI GPT for intelligent text extraction and analysis from images. Supports Hebrew and English text recognition.

## 🚀 Features

- **Multi-language OCR**: Support for Hebrew, English, Arabic, and other languages
- **Advanced Image Preprocessing**: Enhanced image quality for better OCR results
- **OpenAI GPT Integration**: Intelligent analysis of extracted text
- **Web Interface**: User-friendly Flask web application
- **Batch Processing**: Process multiple images at once
- **Comprehensive Logging**: Detailed logging for debugging and monitoring

## 📋 Requirements

### System Requirements
- Python 3.8 or higher
- Tesseract OCR (with Hebrew language support)
- OpenAI API key

### Python Dependencies
- `openai` - OpenAI API client
- `Pillow` - Image processing
- `pytesseract` - Tesseract OCR wrapper
- `python-dotenv` - Environment variable management
- `opencv-python` - Advanced image preprocessing
- `numpy` - Numerical operations
- `flask` - Web interface (optional)
- `flask-cors` - CORS support for web interface

## 🛠️ Installation

### 1. Clone or Download the Project
```bash
git clone <repository-url>
cd ocr-gpt-integration
```

### 2. Run the Setup Script
```bash
python setup.py
```

The setup script will:
- Check Python version compatibility
- Install Python dependencies
- Check/Install Tesseract OCR
- Create necessary directories
- Test the installation

### 3. Manual Installation (Alternative)

#### Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### Install Tesseract OCR

**Windows:**
1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install with Hebrew language support
3. Add to PATH environment variable

**macOS:**
```bash
brew install tesseract tesseract-lang
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-heb
```

### 4. Set Environment Variables
```bash
export OPENAI_API_KEY='your-openai-api-key-here'
```

Or create a `.env` file:
```env
OPENAI_API_KEY=your-openai-api-key-here
```

## 🚀 Usage

### Basic Usage

#### Command Line Interface
```bash
# Basic OCR-GPT processing
python ocr_gpt_integration.py path/to/image.jpg

# Advanced processing with custom options
python ocr_gpt_advanced.py path/to/image.jpg
```

#### Python API
```python
from ocr_gpt_advanced import AdvancedOCRGPTIntegration

# Initialize the system
ocr_gpt = AdvancedOCRGPTIntegration()

# Process an image
result = ocr_gpt.process_image(
    image_path="path/to/image.jpg",
    languages=['eng', 'heb'],
    model="gpt-4"
)

print(f"Extracted text: {result['extracted_text']}")
print(f"GPT analysis: {result['gpt_analysis']}")
```

### Web Interface

Start the web interface:
```bash
python web_interface.py
```

Then open your browser to: `http://localhost:5000`

### API Endpoints

The web interface provides REST API endpoints:

#### Process Image
```bash
curl -X POST http://localhost:5000/upload \
  -F "file=@image.jpg" \
  -F "languages=eng,heb" \
  -F "model=gpt-4"
```

#### Health Check
```bash
curl http://localhost:5000/health
```

## 📁 Project Structure

```
ocr-gpt-integration/
├── ocr_gpt_integration.py      # Basic OCR-GPT integration
├── ocr_gpt_advanced.py         # Advanced version with preprocessing
├── web_interface.py            # Flask web interface
├── setup.py                    # Installation script
├── requirements.txt            # Python dependencies
├── README.md                  # This file
├── uploads/                   # Uploaded images (web interface)
├── results/                   # Processing results
└── logs/                      # Log files
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `TESSERACT_PATH` | Custom Tesseract path | No |
| `LOG_LEVEL` | Logging level (INFO, DEBUG, etc.) | No |

### Tesseract Configuration

The system uses the following Tesseract configuration:
- **OCR Engine Mode**: 3 (Default)
- **Page Segmentation Mode**: 6 (Uniform block of text)
- **Languages**: English + Hebrew (configurable)

### OpenAI Configuration

- **Default Model**: GPT-4
- **Max Tokens**: 1500
- **Temperature**: 0.3 (for consistent analysis)

## 📊 Example Output

### Input Image
Any image containing text (documents, screenshots, etc.)

### Output
```json
{
  "extracted_text": "הטקסט שהוחלץ מהתמונה...",
  "gpt_analysis": "Analysis of the extracted text...",
  "success": true,
  "image_path": "path/to/image.jpg",
  "languages_used": ["eng", "heb"],
  "model_used": "gpt-4",
  "timestamp": "2024-01-15T10:30:00"
}
```

## 🧪 Testing

### Test Installation
```bash
python setup.py
```

### Test Basic Functionality
```bash
python ocr_gpt_integration.py test_image.jpg
```

### Test Web Interface
```bash
python web_interface.py
# Then visit http://localhost:5000
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Tesseract Not Found
```
Error: Tesseract OCR is not properly installed or configured
```
**Solution:** Install Tesseract OCR and ensure it's in your PATH

#### 2. OpenAI API Key Error
```
Error: OpenAI API key is required
```
**Solution:** Set the `OPENAI_API_KEY` environment variable

#### 3. Image Processing Error
```
Error: No text was extracted from the image
```
**Solution:** 
- Ensure the image contains clear, readable text
- Try different image formats (PNG, JPG, etc.)
- Check image quality and resolution

#### 4. Language Support Issues
```
Error: Language not supported
```
**Solution:** Install additional Tesseract language packs

### Debug Mode

Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🔒 Security Considerations

- **API Key Security**: Never commit your OpenAI API key to version control
- **File Upload Security**: The web interface validates file types and sizes
- **Environment Variables**: Use `.env` files for local development only

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Tesseract OCR**: Open-source OCR engine
- **OpenAI**: GPT language models
- **Pillow**: Image processing library
- **Flask**: Web framework

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs in the `logs/` directory
3. Open an issue on GitHub

---

**Happy OCR-GPT Processing! 🚀**