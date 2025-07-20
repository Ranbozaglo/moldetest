#!/usr/bin/env python3
"""
Web Interface for OCR-GPT Integration
====================================

Flask web application that provides a user-friendly interface
for the OCR-GPT integration system.
"""

import os
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import json

# Import our OCR-GPT integration
from ocr_gpt_advanced import AdvancedOCRGPTIntegration

# Configure logging
logging.basicConfig(level=logging.INFO)
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
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}

# Initialize OCR-GPT system
try:
    ocr_gpt = AdvancedOCRGPTIntegration()
    logger.info("OCR-GPT system initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize OCR-GPT system: {e}")
    ocr_gpt = None


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    """Main page with upload form."""
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and processing."""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, BMP, TIFF'}), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"File uploaded: {filepath}")
        
        # Get processing parameters
        languages = request.form.get('languages', 'eng,heb').split(',')
        model = request.form.get('model', 'gpt-4')
        custom_prompt = request.form.get('custom_prompt', None)
        
        # Process the image
        if ocr_gpt is None:
            return jsonify({'error': 'OCR-GPT system not available'}), 500
        
        result = ocr_gpt.process_image(
            filepath, 
            custom_prompt=custom_prompt,
            languages=languages,
            model=model
        )
        
        # Save result to file
        result_filename = f"result_{timestamp}.json"
        result_filepath = os.path.join(app.config['RESULTS_FOLDER'], result_filename)
        with open(result_filepath, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        # Add result file path to response
        result['result_file'] = result_filepath
        
        logger.info(f"Processing completed: {result_filepath}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing upload: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/results/<filename>')
def download_result(filename):
    """Download a result file."""
    try:
        filepath = os.path.join(app.config['RESULTS_FOLDER'], filename)
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True)
        else:
            return jsonify({'error': 'Result file not found'}), 404
    except Exception as e:
        logger.error(f"Error downloading result: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health')
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'ocr_gpt_available': ocr_gpt is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/process', methods=['POST'])
def api_process():
    """API endpoint for processing images."""
    try:
        data = request.get_json()
        
        if not data or 'image_path' not in data:
            return jsonify({'error': 'image_path is required'}), 400
        
        image_path = data['image_path']
        languages = data.get('languages', ['eng', 'heb'])
        model = data.get('model', 'gpt-4')
        custom_prompt = data.get('custom_prompt', None)
        
        # Check if file exists
        if not os.path.exists(image_path):
            return jsonify({'error': 'Image file not found'}), 404
        
        # Process the image
        if ocr_gpt is None:
            return jsonify({'error': 'OCR-GPT system not available'}), 500
        
        result = ocr_gpt.process_image(
            image_path,
            custom_prompt=custom_prompt,
            languages=languages,
            model=model
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in API processing: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Create templates directory and HTML template
    templates_dir = Path('templates')
    templates_dir.mkdir(exist_ok=True)
    
    # Create HTML template
    html_template = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OCR-GPT Integration</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        input[type="file"], select, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        button {
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
        }
        button:hover {
            background-color: #0056b3;
        }
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .result {
            margin-top: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        .loading {
            text-align: center;
            color: #666;
        }
        .error {
            color: #dc3545;
            background-color: #f8d7da;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
        .success {
            color: #155724;
            background-color: #d4edda;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>OCR-GPT Integration</h1>
        
        <form id="uploadForm" enctype="multipart/form-data">
            <div class="form-group">
                <label for="file">Select Image File:</label>
                <input type="file" id="file" name="file" accept="image/*" required>
            </div>
            
            <div class="form-group">
                <label for="languages">Languages:</label>
                <select id="languages" name="languages">
                    <option value="eng,heb">English + Hebrew</option>
                    <option value="eng">English Only</option>
                    <option value="heb">Hebrew Only</option>
                    <option value="eng,heb,ara">English + Hebrew + Arabic</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="model">GPT Model:</label>
                <select id="model" name="model">
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="custom_prompt">Custom Prompt (Optional):</label>
                <textarea id="custom_prompt" name="custom_prompt" rows="4" placeholder="Enter a custom prompt for GPT analysis..."></textarea>
            </div>
            
            <button type="submit" id="submitBtn">Process Image</button>
        </form>
        
        <div id="loading" class="loading" style="display: none;">
            Processing image... Please wait...
        </div>
        
        <div id="result" class="result" style="display: none;">
            <h3>Results</h3>
            <div id="resultContent"></div>
        </div>
    </div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const result = document.getElementById('result');
            const resultContent = document.getElementById('resultContent');
            
            // Show loading
            submitBtn.disabled = true;
            loading.style.display = 'block';
            result.style.display = 'none';
            
            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Display results
                    resultContent.innerHTML = `
                        <h4>Extracted Text (${data.extracted_text.length} characters):</h4>
                        <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0; max-height: 200px; overflow-y: auto;">
                            <pre>${data.extracted_text}</pre>
                        </div>
                        
                        <h4>GPT Analysis:</h4>
                        <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0; max-height: 400px; overflow-y: auto;">
                            <pre>${data.gpt_analysis}</pre>
                        </div>
                        
                        <p><strong>Languages:</strong> ${data.languages_used.join(', ')}</p>
                        <p><strong>Model:</strong> ${data.model_used}</p>
                        <p><strong>Timestamp:</strong> ${data.timestamp}</p>
                    `;
                    result.style.display = 'block';
                } else {
                    resultContent.innerHTML = `<div class="error">Error: ${data.error}</div>`;
                    result.style.display = 'block';
                }
            } catch (error) {
                resultContent.innerHTML = `<div class="error">Error: ${error.message}</div>`;
                result.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                loading.style.display = 'none';
            }
        });
    </script>
</body>
</html>'''
    
    # Write HTML template
    with open(templates_dir / 'index.html', 'w', encoding='utf-8') as f:
        f.write(html_template)
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000) 