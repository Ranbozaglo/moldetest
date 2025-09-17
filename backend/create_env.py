#!/usr/bin/env python3
"""
Script to create .env file for Supabase configuration
"""

import os

def create_env_file():
    """Create .env file with Supabase configuration template"""
    env_content = """# Supabase Configuration
# Replace these with your actual Supabase credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Backend Configuration
SECRET_KEY=your_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30
"""
    
    env_file = '.env'
    
    if os.path.exists(env_file):
        print(f"⚠️  {env_file} file already exists")
        response = input("Do you want to overwrite it? (y/N): ")
        if response.lower() != 'y':
            print("❌ Operation cancelled")
            return
    
    try:
        with open(env_file, 'w') as f:
            f.write(env_content)
        print(f"✅ Created {env_file} file")
        print("\n📝 Please update the file with your actual Supabase credentials:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your project")
        print("3. Go to Settings > API")
        print("4. Copy the Project URL and anon public key")
        print("5. Update the .env file with these values")
    except Exception as e:
        print(f"❌ Failed to create {env_file}: {e}")

if __name__ == '__main__':
    create_env_file() 