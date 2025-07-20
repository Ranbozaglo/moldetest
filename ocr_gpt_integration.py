#!/usr/bin/env python3
"""
OCR-GPT Integration System
==========================

This system integrates Tesseract OCR with OpenAI GPT to:
1. Extract text from images (Hebrew and English)
2. Send extracted text to GPT-4 for analysis
3. Return the model's response

Requirements:
- Tesseract OCR installed on the system
- OpenAI API key in environment variables
- Python packages: openai, pillow, pytesseract
"""

import os
import sys
import logging
from typing import Optional, Dict, Any
from pathlib import Path

# Third-party imports
import openai
from PIL import Image
import pytesseract

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
    Main class for OCR-GPT integration system.
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize the OCR-GPT integration system.
        
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
        
        logger.info("OCR-GPT Integration system initialized successfully")
    
    def _configure_tesseract(self):
        """Configure Tesseract OCR settings."""
        try:
            # Set Tesseract configuration for Hebrew and English
            self.tesseract_config = '--oem 3 --psm 6 -l heb+eng'
            
            # Test Tesseract installation
            pytesseract.get_tesseract_version()
            logger.info(f"Tesseract version: {pytesseract.get_tesseract_version()}")
            
        except Exception as e:
            logger.error(f"Tesseract configuration failed: {e}")
            raise RuntimeError("Tesseract OCR is not properly installed or configured")
    
    def extract_text_from_image(self, image_path: str) -> str:
        """
        Extract text from an image using Tesseract OCR.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Extracted text as string
        """
        try:
            logger.info(f"Extracting text from image: {image_path}")
            
            # Open and preprocess image
            image = Image.open(image_path)
            
            # Extract text using Tesseract
            extracted_text = pytesseract.image_to_string(
                image, 
                config=self.tesseract_config
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
        cleaned = cleaned.replace('|', 'I')  # Common OCR mistake
        cleaned = cleaned.replace('0', 'O')  # Common OCR mistake in certain contexts
        
        return cleaned
    
    def analyze_text_with_gpt(self, text: str, prompt: Optional[str] = None) -> str:
        """
        Send extracted text to OpenAI GPT for analysis.
        
        Args:
            text: Extracted text to analyze
            prompt: Custom prompt for GPT. If None, uses default prompt.
            
        Returns:
            GPT's response as string
        """
        try:
            logger.info("Sending text to GPT for analysis")
            
            # Default prompt if none provided
            if not prompt:
                prompt = """
                Analyze the following text extracted from an image. 
                Please provide:
                1. A summary of the main content
                2. Key points or important information
                3. Any relevant insights or observations
                
                Text to analyze:
                {text}
                
                Please provide a clear and structured response.
                """
            
            # Format the prompt with the extracted text
            formatted_prompt = prompt.format(text=text)
            
            # Call OpenAI GPT-4
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that analyzes text extracted from images. Provide clear, structured responses."},
                    {"role": "user", "content": formatted_prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            gpt_response = response.choices[0].message.content
            logger.info("Successfully received response from GPT")
            logger.debug(f"GPT response: {gpt_response[:200]}...")
            
            return gpt_response
            
        except Exception as e:
            logger.error(f"Error calling OpenAI GPT: {e}")
            raise
    
    def process_image(self, image_path: str, custom_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Complete pipeline: extract text from image and analyze with GPT.
        
        Args:
            image_path: Path to the image file
            custom_prompt: Custom prompt for GPT analysis
            
        Returns:
            Dictionary containing extracted text and GPT analysis
        """
        try:
            logger.info(f"Starting complete processing pipeline for: {image_path}")
            
            # Step 1: Extract text from image
            extracted_text = self.extract_text_from_image(image_path)
            
            if not extracted_text.strip():
                logger.warning("No text was extracted from the image")
                return {
                    "extracted_text": "",
                    "gpt_analysis": "No text was found in the image to analyze.",
                    "success": False,
                    "error": "No text extracted"
                }
            
            # Step 2: Analyze with GPT
            gpt_analysis = self.analyze_text_with_gpt(extracted_text, custom_prompt)
            
            result = {
                "extracted_text": extracted_text,
                "gpt_analysis": gpt_analysis,
                "success": True,
                "image_path": image_path
            }
            
            logger.info("Complete processing pipeline finished successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in processing pipeline: {e}")
            return {
                "extracted_text": "",
                "gpt_analysis": f"Error processing image: {str(e)}",
                "success": False,
                "error": str(e)
            }


def main():
    """
    Main function to demonstrate the OCR-GPT integration.
    """
    try:
        # Initialize the system
        logger.info("Initializing OCR-GPT Integration System")
        ocr_gpt = OCRGPTIntegration()
        
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
            print("Usage: python ocr_gpt_integration.py <image_path>")
            return
        
        # Process the image
        result = ocr_gpt.process_image(image_path)
        
        # Display results
        print("\n" + "="*50)
        print("OCR-GPT INTEGRATION RESULTS")
        print("="*50)
        
        if result["success"]:
            print(f"\n📷 Image: {result['image_path']}")
            print(f"\n📝 Extracted Text ({len(result['extracted_text'])} characters):")
            print("-" * 30)
            print(result['extracted_text'])
            
            print(f"\n🤖 GPT Analysis:")
            print("-" * 30)
            print(result['gpt_analysis'])
        else:
            print(f"\n❌ Processing failed: {result.get('error', 'Unknown error')}")
        
        print("\n" + "="*50)
        
    except Exception as e:
        logger.error(f"Main execution error: {e}")
        print(f"Error: {e}")


if __name__ == "__main__":
    main() 