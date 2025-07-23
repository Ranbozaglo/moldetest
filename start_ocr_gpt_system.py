#!/usr/bin/env python3
"""
OCR-GPT System Startup Script with Google Cloud Vision
======================================================

This script starts the complete OCR-GPT integration system including:
- Python OCR-GPT backend API with Google Cloud Vision
- Web interface (optional)
- Health checks and monitoring
"""

import os
import sys
import time
import subprocess
import threading
from pathlib import Path

def check_dependencies():
    """Check if all required dependencies are installed."""
    print("🔍 Checking dependencies...")
    
    required_packages = [
        'flask',
        'flask-cors',
        'openai',
        'google-cloud-vision',
        'Pillow',
        'python-dotenv'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'google-cloud-vision':
                __import__('google.cloud.vision')
            else:
                __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - Missing")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
        print("Please install missing packages:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    print("✅ All dependencies are installed")
    return True

def check_environment():
    """Check if required environment variables are set."""
    print("🔍 Checking environment variables...")
    
    required_env_vars = {
        'OPENAI_API_KEY': 'OpenAI API key for GPT analysis',
        'GOOGLE_APPLICATION_CREDENTIALS': 'Path to Google Cloud service account JSON file'
    }
    
    missing_vars = []
    
    for var, description in required_env_vars.items():
        if os.getenv(var):
            print(f"✅ {var}")
        else:
            print(f"❌ {var} - Missing ({description})")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("\nTo set up Google Cloud Vision:")
        print("1. Create a Google Cloud project")
        print("2. Enable the Vision API")
        print("3. Create a service account and download the JSON key file")
        print("4. Set GOOGLE_APPLICATION_CREDENTIALS to the path of the JSON file")
        print("\nExample:")
        print("export GOOGLE_APPLICATION_CREDENTIALS='/path/to/your/service-account-key.json'")
        print("export OPENAI_API_KEY='your-openai-api-key'")
        return False
    
    print("✅ All environment variables are set")
    return True

def start_backend_api():
    """Start the OCR-GPT backend API."""
    print("\n🚀 Starting OCR-GPT Backend API...")
    
    try:
        # Check if backend file exists
        backend_file = Path('backend/ocr_gpt_api.py')
        if not backend_file.exists():
            print("❌ Backend API file not found: backend/ocr_gpt_api.py")
            return None
        
        # Start the backend API
        process = subprocess.Popen([
            sys.executable, 'backend/ocr_gpt_api.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        print("✅ Backend API started on http://localhost:5001")
        return process
        
    except Exception as e:
        print(f"❌ Error starting backend API: {e}")
        return None

def start_web_interface():
    """Start the OCR-GPT web interface."""
    print("\n🚀 Starting OCR-GPT Web Interface...")
    
    try:
        # Check if web interface file exists
        web_file = Path('web_interface.py')
        if not web_file.exists():
            print("❌ Web interface file not found: web_interface.py")
            return None
        
        # Start the web interface
        process = subprocess.Popen([
            sys.executable, 'web_interface.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        print("✅ Web interface started on http://localhost:5000")
        return process
        
    except Exception as e:
        print(f"❌ Error starting web interface: {e}")
        return None

def health_check():
    """Perform health checks on running services."""
    print("\n🔍 Performing health checks...")
    
    import requests
    
    # Check backend API
    try:
        response = requests.get('http://localhost:5001/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend API: {data.get('status', 'unknown')}")
            print(f"   OCR-GPT available: {data.get('ocr_gpt_available', False)}")
        else:
            print(f"❌ Backend API: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Backend API: {e}")
    
    # Check web interface
    try:
        response = requests.get('http://localhost:5000', timeout=5)
        if response.status_code == 200:
            print("✅ Web interface: Running")
        else:
            print(f"❌ Web interface: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Web interface: {e}")

def main():
    """Main startup function."""
    print("🚀 OCR-GPT System Startup")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Dependencies check failed. Please install missing packages.")
        return False
    
    # Check environment
    if not check_environment():
        print("\n❌ Environment check failed. Please fix configuration issues.")
        return False
    
    # Start services
    backend_process = start_backend_api()
    web_process = start_web_interface()
    
    if not backend_process:
        print("\n❌ Failed to start backend API")
        return False
    
    # Wait a moment for services to start
    print("\n⏳ Waiting for services to start...")
    time.sleep(3)
    
    # Perform health checks
    health_check()
    
    print("\n🎉 OCR-GPT System is running!")
    print("\n📋 Available Services:")
    print("   • Backend API: http://localhost:5001")
    print("   • Web Interface: http://localhost:5000")
    print("   • Health Check: http://localhost:5001/health")
    
    print("\n📖 Usage:")
    print("   • Upload images via web interface")
    print("   • Use API endpoints for programmatic access")
    print("   • Check logs for detailed information")
    
    print("\n🛑 Press Ctrl+C to stop all services")
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping services...")
        
        if backend_process:
            backend_process.terminate()
            print("✅ Backend API stopped")
        
        if web_process:
            web_process.terminate()
            print("✅ Web interface stopped")
        
        print("👋 OCR-GPT System stopped")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 