#!/usr/bin/env python3
"""
OCR-GPT Integration System with Google Cloud Vision
===================================================

This system integrates Google Cloud Vision API with OpenAI GPT to:
1. Extract text from images using Google Cloud Vision (Hebrew and English)
2. Send extracted text to GPT-4 for analysis
3. Return the model's response

Requirements:
- Google Cloud Vision API credentials
- OpenAI API key in environment variables
- Python packages: openai, google-cloud-vision, pillow
"""

import os
import sys
import logging
import base64
from typing import Optional, Dict, Any, List
from pathlib import Path

# Third-party imports
import openai
from PIL import Image
from google.cloud import vision

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ocr_gpt.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class OCRGPTIntegration:
    """
    Main class for OCR-GPT integration system using Google Cloud Vision.
    """
    
    def __init__(self, openai_api_key: Optional[str] = None, google_credentials_path: Optional[str] = None):
        """
        Initialize the OCR-GPT integration system.
        
        Args:
            openai_api_key: OpenAI API key. If None, will try to get from environment.
            google_credentials_path: Path to Google Cloud credentials JSON file.
        """
        # Initialize OpenAI
        self.openai_api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable.")
        
        openai.api_key = self.openai_api_key
        logger.info("OpenAI client initialized")
        
        # Initialize Google Cloud Vision
        if google_credentials_path:
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = google_credentials_path
        elif not os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
            logger.warning("Google Cloud credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS environment variable.")
        
        try:
            self.vision_client = vision.ImageAnnotatorClient()
            logger.info("Google Cloud Vision client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Google Cloud Vision client: {e}")
            raise
    
    def extract_text_from_image(self, image_path: str, languages: List[str] = None) -> Dict[str, Any]:
        """
        Extract text from image using Google Cloud Vision API.
        
        Args:
            image_path: Path to the image file
            languages: List of language codes (e.g., ['en', 'he'])
            
        Returns:
            Dictionary with extracted text and metadata
        """
        try:
            logger.info(f"Extracting text from image: {image_path}")
            
            # Read image file
            with open(image_path, 'rb') as image_file:
                content = image_file.read()
            
            # Create Vision API image object
            image = vision.Image(content=content)
            
            # Configure text detection with language hints
            image_context = vision.ImageContext()
            if languages:
                image_context.language_hints = languages
            
            # Perform text detection
            response = self.vision_client.text_detection(
                image=image,
                image_context=image_context
            )
            
            # Check for errors
            if response.error.message:
                raise Exception(f"Google Cloud Vision API error: {response.error.message}")
            
            # Extract text
            texts = response.text_annotations
            if texts:
                extracted_text = texts[0].description
                logger.info(f"Successfully extracted {len(extracted_text)} characters")
                
                return {
                    'success': True,
                    'text': extracted_text,
                    'confidence': 'high',  # Google Cloud Vision doesn't provide confidence scores
                    'language_detected': 'multiple' if languages and len(languages) > 1 else (languages[0] if languages else 'auto'),
                    'method': 'google_cloud_vision'
                }
            else:
                logger.warning("No text found in image")
                return {
                    'success': True,
                    'text': '',
                    'confidence': 'low',
                    'language_detected': 'none',
                    'method': 'google_cloud_vision'
                }
                
        except Exception as e:
            logger.error(f"Error extracting text from image: {e}")
            return {
                'success': False,
                'error': str(e),
                'text': '',
                'method': 'google_cloud_vision'
            }
    
    def analyze_text_with_gpt(self, text: str, custom_prompt: str = None, model: str = "gpt-4") -> str:
        """
        Analyze extracted text using OpenAI GPT.
        
        Args:
            text: Extracted text to analyze
            custom_prompt: Custom prompt for analysis
            model: OpenAI model to use
            
        Returns:
            GPT analysis response
        """
        try:
            if not text.strip():
                return "No text was extracted from the image for analysis."
            
            # Default prompt if none provided
            if not custom_prompt:
                custom_prompt = """
                Please analyze the following text extracted from a mold testing laboratory report:
                
                {text}
                
                Provide a professional analysis including:
                1. Summary of findings
                2. Health implications
                3. Recommendations for action
                4. Any concerning levels or types of mold detected
                """
            
            # Format prompt with extracted text
            formatted_prompt = custom_prompt.format(text=text)
            
            logger.info(f"Sending text to GPT-4 for analysis (model: {model})")
            
            # Call OpenAI API (compatible with version 0.28.1)
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a professional mold inspection analyst with expertise in interpreting laboratory reports."},
                    {"role": "user", "content": formatted_prompt}
                ],
                max_tokens=1500,
                temperature=0.3
            )
            
            analysis = response.choices[0].message.content
            logger.info("GPT analysis completed successfully")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error in GPT analysis: {e}")
            return f"Error analyzing text: {str(e)}"
    
    def process_image(self, image_path: str, custom_prompt: str = None, languages: List[str] = None, model: str = "gpt-4") -> Dict[str, Any]:
        """
        Complete image processing pipeline: OCR + GPT analysis.
        
        Args:
            image_path: Path to the image file
            custom_prompt: Custom prompt for GPT analysis
            languages: List of language codes for OCR
            model: OpenAI model to use
            
        Returns:
            Dictionary with complete processing results
        """
        try:
            logger.info(f"Starting complete image processing for: {image_path}")
            
            # Step 1: Extract text using Google Cloud Vision
            ocr_result = self.extract_text_from_image(image_path, languages or ['en', 'he'])
            
            if not ocr_result['success']:
                return {
                    'success': False,
                    'error': f"OCR failed: {ocr_result.get('error', 'Unknown error')}",
                    'stage': 'ocr'
                }
            
            extracted_text = ocr_result['text']
            
            if not extracted_text.strip():
                return {
                    'success': True,
                    'extracted_text': '',
                    'analysis': 'No text was found in the image to analyze.',
                    'ocr_details': ocr_result
                }
            
            # Step 2: Analyze with GPT
            analysis = self.analyze_text_with_gpt(extracted_text, custom_prompt, model)
            
            logger.info("Complete image processing finished successfully")
            
            return {
                'success': True,
                'extracted_text': extracted_text,
                'analysis': analysis,
                'ocr_details': ocr_result,
                'model_used': model
            }
            
        except Exception as e:
            logger.error(f"Error in complete image processing: {e}")
            return {
                'success': False,
                'error': str(e),
                'stage': 'processing'
            }


def main():
    """
    Main function for testing the OCR-GPT integration.
    """
    # Check for required environment variables
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ OPENAI_API_KEY environment variable is required")
        return
    
    if not os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
        print("❌ GOOGLE_APPLICATION_CREDENTIALS environment variable is required")
        print("   Set it to the path of your Google Cloud service account JSON file")
        return
    
    try:
        # Initialize the system
        ocr_gpt = OCRGPTIntegration()
        print("✅ OCR-GPT system initialized successfully")
        
        # Test with a sample image (if provided as command line argument)
        if len(sys.argv) > 1:
            image_path = sys.argv[1]
            if os.path.exists(image_path):
                print(f"🔍 Processing image: {image_path}")
                result = ocr_gpt.process_image(image_path)
                
                if result['success']:
                    print("✅ Processing completed successfully")
                    print(f"📝 Extracted text: {result['extracted_text'][:200]}...")
                    print(f"🤖 Analysis: {result['analysis'][:200]}...")
                else:
                    print(f"❌ Processing failed: {result['error']}")
            else:
                print(f"❌ Image file not found: {image_path}")
        else:
            print("💡 Usage: python ocr_gpt_integration.py <image_path>")
            
    except Exception as e:
        print(f"❌ Failed to initialize system: {e}")


if __name__ == "__main__":
    main() 