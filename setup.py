#!/usr/bin/env python3
"""
Setup Script for OCR-GPT Integration
====================================

This script helps set up the OCR-GPT integration system.
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✅ Python version: {sys.version}")

def install_requirements():
    """Install Python requirements."""
    try:
        print("📦 Installing Python requirements...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Python requirements installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing requirements: {e}")
        sys.exit(1)

def check_tesseract():
    """Check if Tesseract is installed."""
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        print(f"✅ Tesseract version: {version}")
        return True
    except Exception as e:
        print(f"❌ Tesseract not found: {e}")
        return False

def install_tesseract():
    """Install Tesseract OCR."""
    system = platform.system().lower()
    
    print(f"🔧 Installing Tesseract for {system}...")
    
    if system == "windows":
        print("""
For Windows, please install Tesseract manually:
1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install with Hebrew language support
3. Add to PATH environment variable
""")
    elif system == "darwin":  # macOS
        try:
            subprocess.check_call(["brew", "install", "tesseract", "tesseract-lang"])
            print("✅ Tesseract installed via Homebrew")
        except subprocess.CalledProcessError:
            print("❌ Homebrew not found. Please install Homebrew first.")
    else:  # Linux
        try:
            subprocess.check_call(["sudo", "apt-get", "update"])
            subprocess.check_call(["sudo", "apt-get", "install", "-y", "tesseract-ocr", "tesseract-ocr-heb"])
            print("✅ Tesseract installed via apt")
        except subprocess.CalledProcessError:
            print("❌ Error installing Tesseract. Please install manually.")

def check_openai_key():
    """Check if OpenAI API key is set."""
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        print("✅ OpenAI API key found in environment")
        return True
    else:
        print("❌ OpenAI API key not found")
        print("Please set the OPENAI_API_KEY environment variable:")
        print("export OPENAI_API_KEY='your-api-key-here'")
        return False

def create_env_template():
    """Create .env template file."""
    env_content = """# OCR-GPT Integration Environment Variables
# ================================================

# OpenAI API Key (required)
OPENAI_API_KEY=your-openai-api-key-here

# Optional: Custom Tesseract path (if not in PATH)
# TESSERACT_PATH=/usr/local/bin/tesseract

# Optional: Logging level
# LOG_LEVEL=INFO

# Optional: Flask settings (for web interface)
# FLASK_ENV=development
# FLASK_DEBUG=True
"""
    
    with open('.env.template', 'w') as f:
        f.write(env_content)
    
    print("✅ Created .env.template file")

def create_directories():
    """Create necessary directories."""
    directories = ['uploads', 'results', 'logs']
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    
    print("✅ Created necessary directories")

def test_installation():
    """Test the installation."""
    try:
        print("🧪 Testing installation...")
        
        # Test imports
        import openai
        import pytesseract
        from PIL import Image
        print("✅ All Python packages imported successfully")
        
        # Test Tesseract
        version = pytesseract.get_tesseract_version()
        print(f"✅ Tesseract working: {version}")
        
        # Test OpenAI (if key is available)
        if os.getenv('OPENAI_API_KEY'):
            print("✅ OpenAI API key available")
        else:
            print("⚠️  OpenAI API key not set (will need to be set before use)")
        
        print("✅ Installation test completed successfully")
        
    except Exception as e:
        print(f"❌ Installation test failed: {e}")
        return False
    
    return True

def main():
    """Main setup function."""
    print("🚀 OCR-GPT Integration Setup")
    print("=" * 40)
    
    # Check Python version
    check_python_version()
    
    # Install Python requirements
    install_requirements()
    
    # Check/Install Tesseract
    if not check_tesseract():
        install_tesseract()
        if not check_tesseract():
            print("❌ Tesseract installation failed. Please install manually.")
            sys.exit(1)
    
    # Check OpenAI API key
    check_openai_key()
    
    # Create directories
    create_directories()
    
    # Create environment template
    create_env_template()
    
    # Test installation
    if test_installation():
        print("\n🎉 Setup completed successfully!")
        print("\nNext steps:")
        print("1. Set your OpenAI API key: export OPENAI_API_KEY='your-key'")
        print("2. Run the basic script: python ocr_gpt_integration.py <image_path>")
        print("3. Or run the advanced script: python ocr_gpt_advanced.py <image_path>")
        print("4. Or start the web interface: python web_interface.py")
    else:
        print("\n❌ Setup failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main() 