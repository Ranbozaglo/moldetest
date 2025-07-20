#!/usr/bin/env python3
"""
Test Script for OCR-GPT Integration
===================================

This script tests the OCR-GPT integration system with sample images.
"""

import os
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_basic_functionality():
    """Test basic OCR-GPT functionality."""
    try:
        from ocr_gpt_integration import OCRGPTIntegration
        
        print("🧪 Testing basic OCR-GPT integration...")
        
        # Initialize the system
        ocr_gpt = OCRGPTIntegration()
        print("✅ Basic system initialized successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Basic functionality test failed: {e}")
        return False

def test_advanced_functionality():
    """Test advanced OCR-GPT functionality."""
    try:
        from ocr_gpt_advanced import AdvancedOCRGPTIntegration
        
        print("🧪 Testing advanced OCR-GPT integration...")
        
        # Initialize the system
        ocr_gpt = AdvancedOCRGPTIntegration()
        print("✅ Advanced system initialized successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Advanced functionality test failed: {e}")
        return False

def test_web_interface():
    """Test web interface functionality."""
    try:
        from web_interface import app
        
        print("🧪 Testing web interface...")
        
        # Test if Flask app can be created
        with app.test_client() as client:
            response = client.get('/health')
            print("✅ Web interface test passed")
        
        return True
        
    except Exception as e:
        print(f"❌ Web interface test failed: {e}")
        return False

def test_dependencies():
    """Test if all dependencies are available."""
    dependencies = [
        ('openai', 'OpenAI API client'),
        ('PIL', 'Pillow image processing'),
        ('pytesseract', 'Tesseract OCR wrapper'),
        ('cv2', 'OpenCV for image processing'),
        ('numpy', 'NumPy for numerical operations'),
        ('flask', 'Flask web framework'),
    ]
    
    print("🧪 Testing dependencies...")
    
    for module_name, description in dependencies:
        try:
            __import__(module_name)
            print(f"✅ {description} ({module_name})")
        except ImportError as e:
            print(f"❌ {description} ({module_name}): {e}")
            return False
    
    return True

def test_tesseract():
    """Test Tesseract OCR installation."""
    try:
        import pytesseract
        
        print("🧪 Testing Tesseract OCR...")
        
        # Get Tesseract version
        version = pytesseract.get_tesseract_version()
        print(f"✅ Tesseract version: {version}")
        
        return True
        
    except Exception as e:
        print(f"❌ Tesseract test failed: {e}")
        return False

def test_openai_key():
    """Test OpenAI API key availability."""
    api_key = os.getenv('OPENAI_API_KEY')
    
    if api_key:
        print("✅ OpenAI API key found")
        return True
    else:
        print("⚠️  OpenAI API key not set (will need to be set before use)")
        return False

def create_test_image():
    """Create a simple test image with text."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        print("🧪 Creating test image...")
        
        # Create a simple image with text
        img = Image.new('RGB', (400, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        # Add English text
        draw.text((20, 20), "Hello World!", fill='black', font=font)
        draw.text((20, 50), "This is a test image for OCR.", fill='black', font=font)
        
        # Add Hebrew text (if font supports it)
        try:
            draw.text((20, 80), "שלום עולם!", fill='black', font=font)
            draw.text((20, 110), "זהו תמונה לבדיקה של OCR.", fill='black', font=font)
        except:
            print("⚠️  Hebrew text not supported by current font")
        
        # Save the image
        test_image_path = "test_image.jpg"
        img.save(test_image_path)
        print(f"✅ Test image created: {test_image_path}")
        
        return test_image_path
        
    except Exception as e:
        print(f"❌ Failed to create test image: {e}")
        return None

def test_full_pipeline():
    """Test the complete OCR-GPT pipeline."""
    try:
        from ocr_gpt_advanced import AdvancedOCRGPTIntegration
        
        print("🧪 Testing complete pipeline...")
        
        # Create test image
        test_image_path = create_test_image()
        if not test_image_path:
            print("❌ Cannot test pipeline without test image")
            return False
        
        # Initialize system
        ocr_gpt = AdvancedOCRGPTIntegration()
        
        # Process the test image
        result = ocr_gpt.process_image(test_image_path)
        
        if result['success']:
            print("✅ Complete pipeline test passed")
            print(f"📝 Extracted text length: {len(result['extracted_text'])} characters")
            print(f"🤖 GPT analysis length: {len(result['gpt_analysis'])} characters")
            return True
        else:
            print(f"❌ Pipeline test failed: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Pipeline test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 OCR-GPT Integration Test Suite")
    print("=" * 50)
    
    tests = [
        ("Dependencies", test_dependencies),
        ("Tesseract OCR", test_tesseract),
        ("OpenAI API Key", test_openai_key),
        ("Basic Functionality", test_basic_functionality),
        ("Advanced Functionality", test_advanced_functionality),
        ("Web Interface", test_web_interface),
        ("Complete Pipeline", test_full_pipeline),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        if test_func():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The system is ready to use.")
        print("\nNext steps:")
        print("1. Set your OpenAI API key: export OPENAI_API_KEY='your-key'")
        print("2. Run: python ocr_gpt_integration.py test_image.jpg")
        print("3. Or start web interface: python web_interface.py")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        print("\nTroubleshooting:")
        print("1. Run: python setup.py")
        print("2. Install missing dependencies")
        print("3. Set OpenAI API key")
        print("4. Install Tesseract OCR")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 