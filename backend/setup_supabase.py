#!/usr/bin/env python3
"""
Setup script for Supabase configuration
"""

import os
from dotenv import load_dotenv

def setup_supabase():
    """Setup Supabase environment variables"""
    print("🔧 Setting up Supabase configuration...")
    
    # Check if .env file exists
    env_file = '.env'
    if not os.path.exists(env_file):
        print(f"📝 Creating {env_file} file...")
        try:
            with open(env_file, 'w') as f:
                f.write("# Supabase Configuration\n")
                f.write("# Replace these with your actual Supabase credentials\n")
                f.write("VITE_SUPABASE_URL=https://your-project-id.supabase.co\n")
                f.write("VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here\n")
                f.write("\n# Backend Configuration\n")
                f.write("SECRET_KEY=your_secret_key_here\n")
                f.write("ACCESS_TOKEN_EXPIRE_MINUTES=30\n")
            print(f"✅ Created {env_file} file")
        except Exception as e:
            print(f"❌ Failed to create {env_file}: {e}")
            return
    else:
        print(f"✅ {env_file} file already exists")
    
    # Load environment variables
    load_dotenv()
    
    # Check if Supabase URL is configured
    supabase_url = os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('VITE_SUPABASE_ANON_KEY')
    
    if supabase_url == 'https://your-project-id.supabase.co' or not supabase_url:
        print("\n⚠️  Please update VITE_SUPABASE_URL in your .env file")
        print("   Get your Supabase URL from: https://supabase.com/dashboard")
        print("   Go to Settings > API > Project URL")
    else:
        print(f"✅ Supabase URL configured: {supabase_url[:30]}...")
    
    if supabase_key == 'your_supabase_anon_key_here' or not supabase_key:
        print("\n⚠️  Please update VITE_SUPABASE_ANON_KEY in your .env file")
        print("   Get your Supabase anon key from: https://supabase.com/dashboard")
        print("   Go to Settings > API > anon public key")
    else:
        print(f"✅ Supabase anon key configured: {supabase_key[:20]}...")
    
    print("\n📋 Next steps:")
    print("1. Update your .env file with your Supabase credentials")
    print("2. Create the following tables in your Supabase database:")
    print("   - users (id, email, password_hash, is_admin, created_at)")
    print("   - inspections (id, user_id, property_address, inspection_date, status, summary, created_at)")
    print("   - samples (id, inspection_id, sample_type, location, notes, created_at)")
    print("3. Run: pip install -r requirements_simple.txt")
    print("4. Run: python simple_main.py")
    
    print("\n💡 To get your Supabase credentials:")
    print("1. Go to https://supabase.com/dashboard")
    print("2. Create a new project or select existing one")
    print("3. Go to Settings > API")
    print("4. Copy the Project URL and anon public key")
    print("5. Update the .env file with these values")

if __name__ == '__main__':
    setup_supabase() 