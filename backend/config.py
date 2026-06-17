import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
env_path = os.path.join(os.path.dirname(__file__), '.env')
print(f"🔍 CONFIG: Looking for .env file at: {env_path}")

if os.path.exists(env_path):
    load_dotenv(env_path)
    print("✅ CONFIG: Loaded environment variables from .env file")
    print(f"✅ CONFIG: .env file size: {os.path.getsize(env_path)} bytes")
else:
    print("⚠️  CONFIG: No .env file found. Using default values.")
    print("📝 Please create a .env file with your Supabase credentials:")

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'your_supabase_url_here')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 'your_supabase_anon_key_here')
# Service role key for trusted server-side access. This key bypasses RLS, so it
# must ONLY ever live in the backend environment and never be sent to the frontend.
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
# Key the backend uses for its Supabase client: prefer service_role (bypasses RLS
# so the app keeps working once RLS is enabled), fall back to anon for local dev.
SUPABASE_DB_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

# Backend Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key_here')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30'))

# Google Cloud Vision Configuration
GOOGLE_APPLICATION_CREDENTIALS = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
print(f"🔍 CONFIG: GOOGLE_APPLICATION_CREDENTIALS from env = {GOOGLE_APPLICATION_CREDENTIALS}")

# Auto-detect gcloud-key.json in project root if env var not set
if not GOOGLE_APPLICATION_CREDENTIALS:
    print("🔍 CONFIG: GOOGLE_APPLICATION_CREDENTIALS not in environment, checking for auto-detection...")
    # Check for gcloud-key.json in project root (parent directory of backend)
    project_root = os.path.dirname(os.path.dirname(__file__))
    gcloud_key_path = os.path.join(project_root, 'gcloud-key.json')
    print(f"🔍 CONFIG: Checking for gcloud-key.json at: {gcloud_key_path}")
    
    if os.path.exists(gcloud_key_path):
        GOOGLE_APPLICATION_CREDENTIALS = gcloud_key_path
        print(f"✅ CONFIG: Auto-detected Google Cloud key file: {gcloud_key_path}")
        # Set environment variable so Google client libraries can find it
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = gcloud_key_path
    else:
        print("⚠️  CONFIG: No Google Cloud key file found. Checked:")
        print(f"   - Environment variable: GOOGLE_APPLICATION_CREDENTIALS")
        print(f"   - Project root: {gcloud_key_path}")
else:
    print(f"✅ CONFIG: Using GOOGLE_APPLICATION_CREDENTIALS from environment: {GOOGLE_APPLICATION_CREDENTIALS}")

# Google Cloud Project Configuration  
GOOGLE_CLOUD_PROJECT = os.getenv('GOOGLE_CLOUD_PROJECT')
print(f"🔍 CONFIG: GOOGLE_CLOUD_PROJECT = {GOOGLE_CLOUD_PROJECT}")

# OpenAI Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
openai_configured = "✅ Configured" if OPENAI_API_KEY else "❌ Not configured"
print(f"🔍 CONFIG: OPENAI_API_KEY = {openai_configured}")

# OCR Configuration
OCR_SUPPORTED_LANGUAGES = ['en', 'he']  # English and Hebrew
OCR_MAX_IMAGE_SIZE_MB = 10

# Validation
def validate_config():
    """Validate that required environment variables are set"""
    if SUPABASE_URL == 'your_supabase_url_here':
        print("❌ SUPABASE_URL not configured")
        print("   Please add SUPABASE_URL=your_supabase_url to .env file")
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
        print("❌ Google Cloud credentials not found")
        print("   Checked locations:")
        print("   - Environment variable: GOOGLE_APPLICATION_CREDENTIALS")
        project_root = os.path.dirname(os.path.dirname(__file__))
        gcloud_key_path = os.path.join(project_root, 'gcloud-key.json')
        print(f"   - Project root: {gcloud_key_path}")
        print("   Please add gcloud-key.json to project root or set GOOGLE_APPLICATION_CREDENTIALS")
        ocr_ready = False
    elif not os.path.exists(GOOGLE_APPLICATION_CREDENTIALS):
        print(f"❌ Google Cloud credentials file not found: {GOOGLE_APPLICATION_CREDENTIALS}")
        print("   Please ensure the file exists and has proper permissions")
        ocr_ready = False
    else:
        print(f"✅ Google Cloud credentials file found: {GOOGLE_APPLICATION_CREDENTIALS}")
        
        # Try to parse the JSON to validate it
        try:
            import json
            with open(GOOGLE_APPLICATION_CREDENTIALS, 'r') as f:
                creds = json.load(f)
                if 'type' in creds and creds['type'] == 'service_account':
                    print(f"✅ Valid service account credentials (project: {creds.get('project_id', 'unknown')})")
                else:
                    print("⚠️  Warning: Credentials file may not be a service account key")
        except Exception as e:
            print(f"⚠️  Warning: Could not validate credentials file: {e}")
    
    if not OPENAI_API_KEY:
        print("⚠️  OPENAI_API_KEY not configured")
        print("   Please add OPENAI_API_KEY=your_openai_key to .env file")
        ocr_ready = False
    else:
        # Mask the API key for security
        masked_key = OPENAI_API_KEY[:8] + "..." + OPENAI_API_KEY[-4:] if len(OPENAI_API_KEY) > 12 else "***"
        print(f"✅ OpenAI API key configured ({masked_key})")
    
    if ocr_ready:
        print("🎯 OCR configuration validated - Real Google Vision OCR available")
        print("🔬 OCR Status: Real Google Cloud Vision")
    else:
        print("⚠️  OCR configuration incomplete - Using mock responses")
        print("🔬 OCR Status: Mock responses - Add credentials for real OCR")
    
    return ocr_ready 