#!/usr/bin/env python3
"""
Test script for OCR-GPT Integration with Google Cloud Vision
============================================================

This script tests the OCR-GPT integration system using Google Cloud Vision API.
"""

import os
import sys
from pathlib import Path

def test_environment():
    """Test if environment is properly configured."""
    print("🧪 Testing Environment Configuration")
    print("=" * 50)
    
    # Check OpenAI API key
    openai_key = os.getenv('OPENAI_API_KEY')
    if openai_key:
        print("✅ OpenAI API key is set")
    else:
        print("❌ OpenAI API key is missing")
        print("   Set: export OPENAI_API_KEY='your-api-key'")
        return False
    
    # Check Google Cloud credentials
    google_creds = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if google_creds:
        if os.path.exists(google_creds):
            print("✅ Google Cloud credentials file found")
        else:
            print(f"❌ Google Cloud credentials file not found: {google_creds}")
            return False
    else:
        print("❌ Google Cloud credentials not set")
        print("   Set: export GOOGLE_APPLICATION_CREDENTIALS='/path/to/service-account.json'")
        return False
    
    return True

def test_imports():
    """Test if all required packages can be imported."""
    print("\n🧪 Testing Package Imports")
    print("=" * 50)
    
    packages = [
        ('openai', 'OpenAI API client'),
        ('google.cloud.vision', 'Google Cloud Vision API'),
        ('PIL', 'Pillow image processing'),
        ('flask', 'Flask web framework'),
        ('flask_cors', 'Flask CORS support')
    ]
    
    all_imported = True
    
    for package, description in packages:
        try:
            __import__(package)
            print(f"✅ {package} - {description}")
        except ImportError as e:
            print(f"❌ {package} - {description} - Error: {e}")
            all_imported = False
    
    return all_imported

def test_ocr_gpt_integration():
    """Test the OCR-GPT integration system."""
    print("\n🧪 Testing OCR-GPT Integration")
    print("=" * 50)
    
    try:
        from ocr_gpt_integration import OCRGPTIntegration
        print("✅ OCR-GPT integration module imported successfully")
        
        # Initialize the system
        ocr_gpt = OCRGPTIntegration()
        print("✅ OCR-GPT system initialized successfully")
        
        # Test text analysis (without image)
        test_text = "Mold Analysis Report: Aspergillus niger - 1000 CFU/m³, Penicillium - 500 CFU/m³"
        analysis = ocr_gpt.analyze_text_with_gpt(test_text)
        
        if analysis and len(analysis) > 10:
            print("✅ GPT text analysis working")
            print(f"   Sample analysis: {analysis[:100]}...")
        else:
            print("❌ GPT text analysis failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ OCR-GPT integration test failed: {e}")
        return False

def test_api_backend():
    """Test the API backend."""
    print("\n🧪 Testing API Backend")
    print("=" * 50)
    
    try:
        # Import and test the API
        sys.path.append('backend')
        from backend.ocr_gpt_api import app, ocr_gpt
        
        if ocr_gpt:
            print("✅ API backend OCR-GPT system initialized")
        else:
            print("❌ API backend OCR-GPT system not initialized")
            return False
        
        # Test health endpoint
        with app.test_client() as client:
            response = client.get('/health')
            if response.status_code == 200:
                data = response.get_json()
                print(f"✅ Health endpoint working - Status: {data.get('status')}")
                print(f"   OCR method: {data.get('ocr_method')}")
                print(f"   OpenAI configured: {data.get('openai_configured')}")
                print(f"   Google Cloud configured: {data.get('google_cloud_configured')}")
            else:
                print(f"❌ Health endpoint failed - Status: {response.status_code}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ API backend test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 OCR-GPT Integration Test Suite with Google Cloud Vision")
    print("=" * 60)
    
    tests = [
        ("Environment Configuration", test_environment),
        ("Package Imports", test_imports),
        ("OCR-GPT Integration", test_ocr_gpt_integration),
        ("API Backend", test_api_backend)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n🔍 Running: {test_name}")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} - PASSED")
            else:
                failed += 1
                print(f"❌ {test_name} - FAILED")
        except Exception as e:
            failed += 1
            print(f"❌ {test_name} - ERROR: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("🏁 Test Summary")
    print("=" * 60)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total: {passed + failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed! OCR-GPT system is ready to use.")
        return True
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please fix the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 