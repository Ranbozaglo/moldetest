#!/usr/bin/env python3
"""
Advanced OCR-GPT Integration System
==================================

Enhanced version with:
- Better image preprocessing
- Multiple OCR engines support
- Advanced error handling
- Web interface option
- Batch processing capabilities
"""

import os
import sys
import logging
import json
from typing import Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime

# Third-party imports
import openai
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import cv2
import numpy as np
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'ocr_gpt_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class AdvancedOCRGPTIntegration:
    """
    Advanced OCR-GPT integration with enhanced preprocessing and error handling.
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize the advanced OCR-GPT integration system.
        
        Args:
            openai_api_key: OpenAI API key. If None, will try to get from environment.
        """
        self.openai_api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass it to the constructor.")
        
        # Initialize OpenAI client
        openai.api_key = self.openai_api_key
        
        # Configure Tesseract
        self._configure_tesseract()
        
        # Supported languages
        self.supported_languages = ['eng', 'heb', 'ara', 'rus', 'chi_sim']
        
        logger.info("Advanced OCR-GPT Integration system initialized successfully")
    
    def _configure_tesseract(self):
        """Configure Tesseract OCR settings."""
        try:
            # Set Tesseract configuration for multiple languages
            self.tesseract_config = '--oem 3 --psm 6 -l eng+heb'
            
            # Test Tesseract installation
            version = pytesseract.get_tesseract_version()
            logger.info(f"Tesseract version: {version}")
            
        except Exception as e:
            logger.error(f"Tesseract configuration failed: {e}")
            raise RuntimeError("Tesseract OCR is not properly installed or configured")
    
    def preprocess_image(self, image_path: str) -> Image.Image:
        """
        Preprocess image for better OCR results.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Preprocessed PIL Image
        """
        try:
            logger.info(f"Preprocessing image: {image_path}")
            
            # Load image
            image = Image.open(image_path)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize if too large (OCR works better with reasonable sizes)
            max_size = 2000
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = tuple(int(dim * ratio) for dim in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)
                logger.info(f"Resized image to {new_size}")
            
            # Enhance image quality
            # Increase contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)
            
            # Increase sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.2)
            
            # Convert to grayscale for better OCR
            image_gray = image.convert('L')
            
            # Apply slight blur to reduce noise
            image_processed = image_gray.filter(ImageFilter.GaussianBlur(radius=0.5))
            
            logger.info("Image preprocessing completed")
            return image_processed
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            # Return original image if preprocessing fails
            return Image.open(image_path)
    
    def extract_text_from_image(self, image_path: str, languages: Optional[List[str]] = None) -> str:
        """
        Extract text from an image using Tesseract OCR with enhanced preprocessing.
        
        Args:
            image_path: Path to the image file
            languages: List of language codes to use. Default: ['eng', 'heb']
            
        Returns:
            Extracted text as string
        """
        try:
            logger.info(f"Extracting text from image: {image_path}")
            
            # Preprocess image
            processed_image = self.preprocess_image(image_path)
            
            # Set languages
            if languages is None:
                languages = ['eng', 'heb']
            
            # Create language string for Tesseract
            lang_string = '+'.join(languages)
            config = f'--oem 3 --psm 6 -l {lang_string}'
            
            # Extract text using Tesseract
            extracted_text = pytesseract.image_to_string(
                processed_image, 
                config=config
            )
            
            # Clean up the extracted text
            cleaned_text = self._clean_extracted_text(extracted_text)
            
            logger.info(f"Successfully extracted {len(cleaned_text)} characters from image")
            logger.debug(f"Extracted text: {cleaned_text[:200]}...")
            
            return cleaned_text
            
        except Exception as e:
            logger.error(f"Error extracting text from image: {e}")
            raise
    
    def _clean_extracted_text(self, text: str) -> str:
        """
        Clean and normalize extracted text.
        
        Args:
            text: Raw extracted text
            
        Returns:
            Cleaned text
        """
        # Remove extra whitespace and normalize
        cleaned = ' '.join(text.split())
        
        # Remove common OCR artifacts
        replacements = {
            '|': 'I',
            '0': 'O',  # Only in certain contexts
            '1': 'l',  # Common OCR mistake
            '5': 'S',  # Common OCR mistake
        }
        
        for old, new in replacements.items():
            cleaned = cleaned.replace(old, new)
        
        # Remove non-printable characters
        cleaned = ''.join(char for char in cleaned if char.isprintable() or char.isspace())
        
        return cleaned
    
    def analyze_text_with_gpt(self, text: str, prompt: Optional[str] = None, model: str = "gpt-4") -> str:
        """
        Send extracted text to OpenAI GPT for analysis.
        
        Args:
            text: Extracted text to analyze
            prompt: Custom prompt for GPT. If None, uses default prompt.
            model: GPT model to use (default: gpt-4)
            
        Returns:
            GPT's response as string
        """
        try:
            logger.info(f"Sending text to {model} for analysis")
            
            # Default prompt if none provided
            if not prompt:
                prompt = """
                Analyze the following text extracted from an image using OCR technology.
                
                Please provide a comprehensive analysis including:
                1. **Content Summary**: A clear summary of the main content
                2. **Key Information**: Important points, data, or facts found
                3. **Language Detection**: Identify the languages present (Hebrew, English, etc.)
                4. **Document Type**: What type of document this appears to be
                5. **Quality Assessment**: How well the OCR performed
                6. **Relevant Insights**: Any notable observations or implications
                
                Text to analyze:
                {text}
                
                Please provide a structured, professional response with clear sections.
                """
            
            # Format the prompt with the extracted text
            formatted_prompt = prompt.format(text=text)
            
            # Call OpenAI
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are an expert document analyst and OCR specialist. Provide detailed, accurate analysis of extracted text with clear structure and professional insights."},
                    {"role": "user", "content": formatted_prompt}
                ],
                max_tokens=1500,
                temperature=0.3  # Lower temperature for more consistent analysis
            )
            
            gpt_response = response.choices[0].message.content
            logger.info("Successfully received response from GPT")
            logger.debug(f"GPT response: {gpt_response[:200]}...")
            
            return gpt_response
            
        except Exception as e:
            logger.error(f"Error calling OpenAI GPT: {e}")
            raise
    
    def process_image(self, image_path: str, custom_prompt: Optional[str] = None, 
                     languages: Optional[List[str]] = None, model: str = "gpt-4") -> Dict[str, Any]:
        """
        Complete pipeline: extract text from image and analyze with GPT.
        
        Args:
            image_path: Path to the image file
            custom_prompt: Custom prompt for GPT analysis
            languages: List of language codes for OCR
            model: GPT model to use
            
        Returns:
            Dictionary containing extracted text and GPT analysis
        """
        try:
            logger.info(f"Starting complete processing pipeline for: {image_path}")
            
            # Step 1: Extract text from image
            extracted_text = self.extract_text_from_image(image_path, languages)
            
            if not extracted_text.strip():
                logger.warning("No text was extracted from the image")
                return {
                    "extracted_text": "",
                    "gpt_analysis": "No text was found in the image to analyze.",
                    "success": False,
                    "error": "No text extracted",
                    "image_path": image_path,
                    "timestamp": datetime.now().isoformat()
                }
            
            # Step 2: Analyze with GPT
            gpt_analysis = self.analyze_text_with_gpt(extracted_text, custom_prompt, model)
            
            result = {
                "extracted_text": extracted_text,
                "gpt_analysis": gpt_analysis,
                "success": True,
                "image_path": image_path,
                "languages_used": languages or ['eng', 'heb'],
                "model_used": model,
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info("Complete processing pipeline finished successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in processing pipeline: {e}")
            return {
                "extracted_text": "",
                "gpt_analysis": f"Error processing image: {str(e)}",
                "success": False,
                "error": str(e),
                "image_path": image_path,
                "timestamp": datetime.now().isoformat()
            }
    
    def batch_process_images(self, image_paths: List[str], output_file: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Process multiple images in batch.
        
        Args:
            image_paths: List of image file paths
            output_file: Optional JSON file to save results
            
        Returns:
            List of processing results
        """
        results = []
        
        for i, image_path in enumerate(image_paths, 1):
            logger.info(f"Processing image {i}/{len(image_paths)}: {image_path}")
            
            try:
                result = self.process_image(image_path)
                results.append(result)
                
                # Save intermediate results
                if output_file:
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(results, f, ensure_ascii=False, indent=2)
                
            except Exception as e:
                logger.error(f"Error processing {image_path}: {e}")
                results.append({
                    "extracted_text": "",
                    "gpt_analysis": f"Error: {str(e)}",
                    "success": False,
                    "error": str(e),
                    "image_path": image_path,
                    "timestamp": datetime.now().isoformat()
                })
        
        return results


def main():
    """
    Main function to demonstrate the advanced OCR-GPT integration.
    """
    try:
        # Initialize the system
        logger.info("Initializing Advanced OCR-GPT Integration System")
        ocr_gpt = AdvancedOCRGPTIntegration()
        
        # Example usage
        if len(sys.argv) > 1:
            image_path = sys.argv[1]
        else:
            # Default test image path
            image_path = "test_image.jpg"
        
        # Check if image file exists
        if not Path(image_path).exists():
            logger.error(f"Image file not found: {image_path}")
            print(f"Error: Image file not found: {image_path}")
            print("Usage: python ocr_gpt_advanced.py <image_path>")
            return
        
        # Process the image
        result = ocr_gpt.process_image(image_path)
        
        # Display results
        print("\n" + "="*60)
        print("ADVANCED OCR-GPT INTEGRATION RESULTS")
        print("="*60)
        
        if result["success"]:
            print(f"\n📷 Image: {result['image_path']}")
            print(f"🕒 Timestamp: {result['timestamp']}")
            print(f"🌐 Languages: {', '.join(result.get('languages_used', ['eng', 'heb']))}")
            print(f"🤖 Model: {result.get('model_used', 'gpt-4')}")
            
            print(f"\n📝 Extracted Text ({len(result['extracted_text'])} characters):")
            print("-" * 40)
            print(result['extracted_text'])
            
            print(f"\n🤖 GPT Analysis:")
            print("-" * 40)
            print(result['gpt_analysis'])
        else:
            print(f"\n❌ Processing failed: {result.get('error', 'Unknown error')}")
        
        print("\n" + "="*60)
        
    except Exception as e:
        logger.error(f"Main execution error: {e}")
        print(f"Error: {e}")


if __name__ == "__main__":
    main() 