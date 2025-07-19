#!/usr/bin/env python3
"""
Setup script for Mold Testing Houston Backend
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def main():
    print("🚀 Setting up Mold Testing Houston Backend...")
    
    # Check if Python 3.8+ is available
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    
    # Install dependencies
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        print("❌ Failed to install dependencies. Please check your Python environment.")
        sys.exit(1)
    
    # Create .env file if it doesn't exist
    env_file = ".env"
    if not os.path.exists(env_file):
        print("📝 Creating .env file from template...")
        env_template = """# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/mold_testing_db

# JWT Configuration
SECRET_KEY=your-secret-key-here-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Email Configuration (for sending reports)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Supabase Configuration (if using Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Application Settings
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
"""
        
        with open(env_file, 'w') as f:
            f.write(env_template)
        print("✅ .env file created. Please edit it with your actual configuration.")
    else:
        print("✅ .env file already exists")
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Edit the .env file with your actual configuration")
    print("2. Set up your PostgreSQL database")
    print("3. Run: python main.py")
    print("4. Access the API at: http://localhost:8000")
    print("5. View documentation at: http://localhost:8000/docs")

if __name__ == "__main__":
    main() 