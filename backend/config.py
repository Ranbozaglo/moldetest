import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
    print("✅ Loaded environment variables from .env file")
else:
    print("⚠️  No .env file found. Using default values.")
    print("📝 Please create a .env file with your Supabase credentials:")

# Supabase Configuration
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', 'your_supabase_url_here')
SUPABASE_ANON_KEY = os.getenv('VITE_SUPABASE_ANON_KEY', 'your_supabase_anon_key_here')

# Backend Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key_here')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30'))

# Google Cloud Vision Configuration
GOOGLE_APPLICATION_CREDENTIALS = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')

# OpenAI Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# OCR Configuration
OCR_SUPPORTED_LANGUAGES = ['en', 'he']  # English and Hebrew
OCR_MAX_IMAGE_SIZE_MB = 10

# Validation
def validate_config():
    """Validate that required environment variables are set"""
    if SUPABASE_URL == 'your_supabase_url_here':
        print("❌ VITE_SUPABASE_URL not configured")
        print("   Please add VITE_SUPABASE_URL=your_supabase_url to .env file")
        return False
    
    if SUPABASE_ANON_KEY == 'your_supabase_anon_key_here':
        print("❌ VITE_SUPABASE_ANON_KEY not configured")
        print("   Please add VITE_SUPABASE_ANON_KEY=your_supabase_anon_key to .env file")
        return False

    print("✅ Supabase configuration validated")
    return True

def validate_ocr_config():
    """Validate OCR-related configuration"""
    ocr_ready = True
    
    if not GOOGLE_APPLICATION_CREDENTIALS:
        print("⚠️  GOOGLE_APPLICATION_CREDENTIALS not configured")
        print("   Please add GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json to .env file")
        ocr_ready = False
    elif not os.path.exists(GOOGLE_APPLICATION_CREDENTIALS):
        print(f"❌ Google Cloud credentials file not found: {GOOGLE_APPLICATION_CREDENTIALS}")
        ocr_ready = False
    else:
        print("✅ Google Cloud credentials file found")
    
    if not OPENAI_API_KEY:
        print("⚠️  OPENAI_API_KEY not configured")
        print("   Please add OPENAI_API_KEY=your_openai_key to .env file")
        ocr_ready = False
    else:
        print("✅ OpenAI API key configured")
    
    if ocr_ready:
        print("✅ OCR configuration validated - Real Google Vision OCR available")
    else:
        print("⚠️  OCR configuration incomplete - Using mock responses")
    
    return ocr_ready 