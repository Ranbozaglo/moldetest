#!/usr/bin/env python3
"""
OCR-GPT API Backend with Google Cloud Vision
============================================

Flask API backend that provides OCR-GPT integration endpoints
for the Mold Testing Houston application using Google Cloud Vision API.
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Import our OCR-GPT integration with Google Cloud Vision
try:
    from ocr_gpt_integration import OCRGPTIntegration
    OCR_GPT_AVAILABLE = True
except ImportError:
    OCR_GPT_AVAILABLE = False
    print("⚠️  OCR-GPT integration not available. Install required packages: google-cloud-vision openai")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['RESULTS_FOLDER'] = 'results'

# Create necessary directories
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)
Path(app.config['RESULTS_FOLDER']).mkdir(exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'}

# Initialize OCR-GPT system with Google Cloud Vision
ocr_gpt = None
if OCR_GPT_AVAILABLE:
    try:
        ocr_gpt = OCRGPTIntegration()
        logger.info("OCR-GPT system with Google Cloud Vision initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize OCR-GPT system: {e}")
        logger.error("Make sure OPENAI_API_KEY and GOOGLE_APPLICATION_CREDENTIALS are set")
        ocr_gpt = None


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def process_image_with_ocr_gpt(image_path: str, prompt: Optional[str] = None, languages: list = None) -> Dict[str, Any]:
    """
    Process an image with OCR-GPT integration using Google Cloud Vision.
    
    Args:
        image_path: Path to the image file
        prompt: Custom prompt for analysis
        languages: List of language codes for OCR
        
    Returns:
        Dictionary with processing results
    """
    if not ocr_gpt:
        return {
            "success": False,
            "error": "OCR-GPT system not available. Check Google Cloud Vision and OpenAI credentials.",
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        logger.info(f"Processing image with Google Cloud Vision OCR-GPT: {image_path}")
        
        # Default prompt for lab analysis if none provided
        if not prompt:
            prompt = """
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
"""
        
        # Process the image with Google Cloud Vision
        result = ocr_gpt.process_image(
            image_path=image_path,
            custom_prompt=prompt,
            languages=languages or ['en', 'he'],
            model="gpt-4"
        )
        
        if result['success']:
            logger.info("Google Cloud Vision OCR-GPT processing completed successfully")
            return {
                "success": True,
                "extracted_text": result['extracted_text'],
                "analysis": result['analysis'],
                "ocr_details": result.get('ocr_details', {}),
                "model_used": result.get('model_used', 'gpt-4'),
                "timestamp": datetime.now().isoformat()
            }
        else:
            logger.error(f"OCR-GPT processing failed: {result.get('error')}")
            return {
                "success": False,
                "error": result.get('error', 'Unknown processing error'),
                "stage": result.get('stage', 'unknown'),
                "timestamp": datetime.now().isoformat()
            }
        
    except Exception as e:
        logger.error(f"Error in OCR-GPT processing: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@app.route('/health')
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'ocr_gpt_available': ocr_gpt is not None,
        'ocr_method': 'google_cloud_vision',
        'openai_configured': bool(os.getenv('OPENAI_API_KEY')),
        'google_cloud_configured': bool(os.getenv('GOOGLE_APPLICATION_CREDENTIALS')),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/llm/invoke', methods=['POST'])
def llm_invoke():
    """LLM invocation endpoint with OCR-GPT support."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        prompt = data.get('prompt')
        file_urls = data.get('file_urls', [])
        model = data.get('model', 'gpt-4')
        
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
        
        logger.info(f"LLM invoke called with prompt: {prompt[:100]}...")
        logger.info(f"File URLs: {file_urls}")
        
        # If file URLs are provided, we need to download and process them
        if file_urls:
            # For now, we'll return a mock response
            # In production, you would download the files and process them
            mock_response = {
                "content": f"Mock OCR-GPT analysis for prompt: '{prompt[:100]}...' with {len(file_urls)} files",
                "usage": {
                    "prompt_tokens": 150,
                    "completion_tokens": 200,
                    "total_tokens": 350
                }
            }
            
            return jsonify(mock_response)
        else:
            # Simple text-based LLM call
            if not ocr_gpt:
                return jsonify({
                    "content": f"Mock LLM response for: {prompt[:100]}...",
                    "usage": {
                        "prompt_tokens": 100,
                        "completion_tokens": 150,
                        "total_tokens": 250
                    }
                })
            
            # Use OCR-GPT for text analysis
            result = ocr_gpt.analyze_text_with_gpt(prompt, model=model)
            
            return jsonify({
                "content": result,
                "usage": {
                    "prompt_tokens": len(prompt.split()),
                    "completion_tokens": len(result.split()),
                    "total_tokens": len(prompt.split()) + len(result.split())
                }
            })
            
    except Exception as e:
        logger.error(f"Error in LLM invoke: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/ocr/process', methods=['POST'])
def ocr_process():
    """OCR processing endpoint."""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP'}), 400
        
        # Get processing parameters
        custom_prompt = request.form.get('custom_prompt', None)
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"File uploaded for OCR processing: {filepath}")
        
        # Process the image
        result = process_image_with_ocr_gpt(filepath, custom_prompt)
        
        # Add file path to result
        result['file_path'] = filepath
        
        logger.info(f"OCR processing completed: {result.get('success', False)}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in OCR processing: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/ocr/analyze', methods=['POST'])
def ocr_analyze():
    """Lab analysis endpoint."""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP'}), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"File uploaded for lab analysis: {filepath}")
        
        # Use lab analysis prompt
        lab_prompt = """
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
"""
        
        # Process the image
        result = process_image_with_ocr_gpt(filepath, lab_prompt)
        
        # Add file path to result
        result['file_path'] = filepath
        
        logger.info(f"Lab analysis completed: {result.get('success', False)}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in lab analysis: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """File upload endpoint."""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP'}), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"File uploaded: {filepath}")
        
        return jsonify({
            'success': True,
            'file_path': filepath,
            'filename': filename,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in file upload: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🚀 Starting OCR-GPT API Backend...")
    print(f"📁 Upload folder: {app.config['UPLOAD_FOLDER']}")
    print(f"📁 Results folder: {app.config['RESULTS_FOLDER']}")
    print(f"🔧 OCR-GPT available: {ocr_gpt is not None}")
    
    app.run(debug=True, host='0.0.0.0', port=5001) 