#!/usr/bin/env python3
"""
Simple Flask Backend for Mold Testing Houston with Supabase
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime
import hashlib
import secrets
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_ANON_KEY, validate_config, validate_ocr_config, GOOGLE_APPLICATION_CREDENTIALS, OPENAI_API_KEY, OCR_SUPPORTED_LANGUAGES
import uuid
from werkzeug.utils import secure_filename
import mimetypes
import logging
import tempfile
import requests
from urllib.parse import urlparse

# OCR and AI imports
try:
    from google.cloud import vision
    import openai
    from PIL import Image
    GOOGLE_VISION_AVAILABLE = True
    print("✅ Google Cloud Vision and OpenAI libraries loaded")
except ImportError as e:
    GOOGLE_VISION_AVAILABLE = False
    print(f"⚠️  OCR libraries not available: {e}")
    print("   Install with: pip install google-cloud-vision openai pillow")

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleOCRIntegration:
    """Simplified OCR integration for lab analysis"""
    
    def __init__(self):
        self.vision_client = None
        self.openai_client = None
        self.is_available = False
        
        print("🔍 INIT: Starting OCR integration initialization...")
        print(f"🔍 INIT: GOOGLE_VISION_AVAILABLE = {GOOGLE_VISION_AVAILABLE}")
        print(f"🔍 INIT: GOOGLE_APPLICATION_CREDENTIALS = {GOOGLE_APPLICATION_CREDENTIALS}")
        print(f"🔍 INIT: OPENAI_API_KEY configured = {bool(OPENAI_API_KEY)}")
        
        # Check each condition individually for better debugging
        if not GOOGLE_VISION_AVAILABLE:
            print("❌ INIT: Google Vision libraries not available")
            print("   Install with: pip install google-cloud-vision")
            return
            
        if not GOOGLE_APPLICATION_CREDENTIALS:
            print("❌ INIT: GOOGLE_APPLICATION_CREDENTIALS environment variable not set")
            print("   Please set GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials.json")
            return
            
        if not OPENAI_API_KEY:
            print("❌ INIT: OPENAI_API_KEY environment variable not set")
            print("   Please set OPENAI_API_KEY=your_openai_key")
            return
        
        print("✅ INIT: All prerequisites met, attempting initialization...")
        
        try:
            # Initialize Google Cloud Vision
            print(f"🔍 INIT: Initializing Google Cloud Vision with credentials: {GOOGLE_APPLICATION_CREDENTIALS}")
            
            # Ensure the credentials file exists
            if not os.path.exists(GOOGLE_APPLICATION_CREDENTIALS):
                raise Exception(f"Google Cloud credentials file not found: {GOOGLE_APPLICATION_CREDENTIALS}")
            
            print("✅ INIT: Credentials file exists, creating Vision client...")
            
            # Initialize the Vision client - it will automatically use the GOOGLE_APPLICATION_CREDENTIALS env var
            self.vision_client = vision.ImageAnnotatorClient()
            print("✅ INIT: Google Vision ImageAnnotatorClient created successfully")
            
            # Initialize OpenAI (using new client format)
            print("🔍 INIT: Initializing OpenAI client...")
            from openai import OpenAI
            self.openai_client = OpenAI(api_key=OPENAI_API_KEY)
            print("✅ INIT: OpenAI client created successfully")
            
            self.is_available = True
            print("✅ INIT: OCR integration initialized successfully!")
            logger.info("✅ OCR integration initialized successfully")
        except Exception as e:
            print(f"❌ INIT: Failed to initialize OCR: {e}")
            print(f"❌ INIT: Error type: {type(e).__name__}")
            print(f"❌ INIT: Error details: {str(e)}")
            logger.error(f"❌ Failed to initialize OCR: {e}")
            self.is_available = False
    
    def extract_text_from_image_url(self, image_url: str):
        """Extract text from image URL using Google Cloud Vision"""
        try:
            logger.info(f"🔍 Extracting text from image: {image_url}")
            
            # Ensure Vision client is available
            if not self.vision_client:
                raise Exception("Google Vision API client not initialized. Please check your credentials and configuration.")
            
            # Download image from URL
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Create Vision API image object
            image = vision.Image(content=response.content)
            
            # Configure text detection with language hints
            image_context = vision.ImageContext(language_hints=OCR_SUPPORTED_LANGUAGES)
            
            # Perform text detection with Google Vision API
            logger.info(f"🔍 Making Google Vision API text_detection call for image: {image_url}")
            response = self.vision_client.text_detection(image=image, image_context=image_context)
            texts = response.text_annotations
            
            if response.error.message:
                logger.error(f"❌ Google Vision API returned error: {response.error.message}")
                raise Exception(f"Google Vision API error: {response.error.message}")
            
            # Extract full text
            extracted_text = texts[0].description if texts else ""
            
            logger.info(f"✅ Google Vision API successfully extracted {len(extracted_text)} characters from image")
            
            return {
                "extracted_text": extracted_text,
                "confidence": "high" if len(extracted_text) > 50 else "medium",
                "language_detected": "multi" if extracted_text else "none"
            }
            
        except Exception as e:
            logger.error(f"❌ Google Vision API call failed: {e}")
            return {"error": str(e), "extracted_text": ""}
    
    def analyze_lab_results_with_gpt(self, extracted_text: str, image_urls: list):
        """Analyze extracted lab text using GPT-4"""
        if not extracted_text.strip():
            raise Exception("No extracted text provided for analysis. Manual review required.")
        
        try:
            prompt = f"""
You are a professional mold inspection expert analyzing laboratory test results. 

EXTRACTED TEXT FROM LAB IMAGES:
{extracted_text}

Please analyze the laboratory results and provide a comprehensive professional assessment.

Return your response as a JSON object with exactly these two fields:

{{
  "conclusion": "Your detailed conclusion here (2-3 paragraphs covering sample identification, mold types detected, concentrations found, health assessment, and overall findings)",
  "recommendations": "Your detailed recommendations here (specific actionable steps including immediate actions, preventive measures, professional services needed, timeline, environmental controls, and follow-up testing)"
}}

Be specific about:
- Mold species and concentrations if mentioned in the lab results
- Health implications and risk levels
- Actionable next steps with timelines
- Professional services that may be needed

If the extracted text is unclear, note what additional information would be helpful in your analysis.
"""

            # Use the pre-initialized OpenAI client
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a certified mold inspection expert providing professional laboratory analysis. Return your response as a JSON object with 'conclusion' and 'recommendations' fields."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.3
            )
            
            analysis_content = response.choices[0].message.content
            
            logger.info("✅ GPT-4 lab analysis completed")
            
            # Try to parse the JSON response
            try:
                import json
                analysis_json = json.loads(analysis_content)
                conclusion = analysis_json.get("conclusion", "")
                recommendations = analysis_json.get("recommendations", "")
                
                # Format the response for frontend consumption
                formatted_analysis = f"""**CONCLUSION**

{conclusion}

**RECOMMENDATIONS**

{recommendations}"""
                
            except json.JSONDecodeError:
                # If JSON parsing fails, use raw content
                logger.warning("⚠️ GPT response was not valid JSON, using raw content")
                formatted_analysis = analysis_content
                conclusion = analysis_content
                recommendations = "Please review the analysis above and consult with a professional for specific recommendations."
            
            return {
                "analysis": formatted_analysis,
                "conclusion": conclusion,
                "recommendations": recommendations,
                "extracted_text": extracted_text,
                "model": "gpt-4-vision-ocr",
                "images_processed": len(image_urls)
            }
            
        except Exception as e:
            logger.error(f"❌ GPT analysis failed: {e}")
            raise Exception(f"GPT analysis failed after successful OCR: {str(e)}. Manual review required.")
    


# Debug JSON credentials file before initializing OCR
print("\n🔍 DEBUG: Checking for gcloud-key.json in project root...")
project_root = os.path.dirname(os.path.dirname(__file__))
gcloud_key_path = os.path.join(project_root, 'gcloud-key.json')
print(f"🔍 DEBUG: Project root path: {project_root}")
print(f"🔍 DEBUG: Looking for gcloud-key.json at: {gcloud_key_path}")
print(f"🔍 DEBUG: File exists: {os.path.exists(gcloud_key_path)}")

if os.path.exists(gcloud_key_path):
    try:
        print(f"🔍 DEBUG: File size: {os.path.getsize(gcloud_key_path)} bytes")
        print(f"🔍 DEBUG: File permissions readable: {os.access(gcloud_key_path, os.R_OK)}")
        
        # Try to read and parse the JSON
        with open(gcloud_key_path, 'r') as f:
            import json
            creds = json.load(f)
            print(f"✅ DEBUG: JSON file parsed successfully")
            print(f"🔍 DEBUG: JSON keys: {list(creds.keys())}")
            print(f"🔍 DEBUG: Service account type: {creds.get('type', 'unknown')}")
            print(f"🔍 DEBUG: Project ID: {creds.get('project_id', 'unknown')}")
            print(f"🔍 DEBUG: Client email: {creds.get('client_email', 'unknown')}")
            
            # Check if this matches GOOGLE_APPLICATION_CREDENTIALS
            current_creds = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            print(f"🔍 DEBUG: Current GOOGLE_APPLICATION_CREDENTIALS: {current_creds}")
            print(f"🔍 DEBUG: Paths match: {os.path.abspath(gcloud_key_path) == os.path.abspath(current_creds) if current_creds else False}")
            
    except json.JSONDecodeError as e:
        print(f"❌ DEBUG: JSON parsing error: {e}")
    except Exception as e:
        print(f"❌ DEBUG: Error reading file: {e}")
else:
    print("❌ DEBUG: gcloud-key.json not found in project root")
    print("🔍 DEBUG: Contents of project root:")
    try:
        files = os.listdir(project_root)
        for file in sorted(files):
            if file.endswith('.json') or 'key' in file.lower() or 'cred' in file.lower():
                print(f"   📄 {file}")
    except Exception as e:
        print(f"❌ DEBUG: Error listing directory: {e}")

print("🔍 DEBUG: Environment variables related to Google Cloud:")
for key, value in os.environ.items():
    if 'GOOGLE' in key or 'GCLOUD' in key:
        print(f"   {key} = {value}")

print("\n🔍 DEBUG: Now initializing OCR integration...")

# Initialize OCR integration
ocr_integration = SimpleOCRIntegration()

# Validate configuration before starting
if not validate_config():
    print("\n❌ Configuration validation failed!")
    print("📝 Please create a .env file in the backend directory with:")
    print("   VITE_SUPABASE_URL=your_supabase_url")
    print("   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key")
    print("   SECRET_KEY=your_secret_key")
    print("\n💡 You can get your Supabase credentials from:")
    print("   https://supabase.com/dashboard")
    exit(1)

# Validate OCR configuration (non-blocking)
print("\n🔍 Checking OCR Configuration...")
ocr_available = validate_ocr_config()
if ocr_available:
    print("🎯 Real Google Cloud Vision OCR will be used for lab analysis")
else:
    print("⚠️  Using mock responses for OCR - Add credentials for real OCR")

# Initialize Supabase client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    print("🔍 Using anon key for Supabase client")
    
    # Test connection to public schema
    print("🔍 Testing connection to public schema...")
    
    # Try public schema
    try:
        result = supabase.table('inspection').select('*').limit(1).execute()
        print("✅ Supabase client initialized successfully with public schema")
    except Exception as e1:
        print(f"⚠️ Public schema test failed: {e1}")
        print("📝 Please create the inspection table in the public schema")
        raise Exception("Inspection table does not exist in public schema")
            
except Exception as e:
    print(f"❌ Failed to initialize Supabase client: {e}")
    print("📝 Please check your Supabase URL and anon key in the .env file")
    print("📝 Make sure tables exist in the public schema")
    exit(1)

# Database setup
def init_db():
    """Initialize Supabase database tables in public schema"""
    try:
        # Test connection to public schema
        print("🔍 Testing connection to public schema...")
        supabase.table('inspection').select('*').limit(1).execute()
        print("✅ Successfully connected to public schema")
    except Exception as e:
        print(f"⚠️ Public schema connection test: {e}")
        print("📝 Make sure your tables are in the public schema")
    
    try:
        # Check inspection table (in public schema)
        print("🔍 Checking inspection table in public schema...")
        supabase.table('inspection').select('*').limit(1).execute()
        print("✅ Inspection table exists in public schema")
    except Exception as e:
        print(f"⚠️ Inspection table setup: {e}")
        print("📝 Please create the inspection table in the public schema")
    
    try:
        # Check samples table (in public schema)
        print("🔍 Checking samples table in public schema...")
        supabase.table('samples').select('*').limit(1).execute()
        print("✅ Samples table exists in public schema")
    except Exception as e:
        print(f"⚠️ Samples table setup: {e}")
        print("📝 Please create the samples table in the public schema")
    
    try:
        # Check user_profiles table (in public schema)
        print("🔍 Checking user_profiles table in public schema...")
        supabase.table('user_profiles').select('*').limit(1).execute()
        print("✅ User_profiles table exists in public schema")
    except Exception as e:
        print(f"⚠️ User_profiles table setup: {e}")
        print("📝 Please create the user_profiles table in the public schema")
    
    # Insert admin user if not exists (in public schema)
    admin_email = "rotemiluz53@gmail.com"
    admin_password = "admin123"  # In production, use proper password hashing
    admin_hash = hashlib.sha256(admin_password.encode()).hexdigest()
    
    try:
        # Check if admin user exists in user_profiles table
        result = supabase.table('user_profiles').select('*').eq('email', admin_email).execute()
        if not result.data:
            # Insert admin user in user_profiles table
            supabase.table('user_profiles').insert({
                'id': str(uuid.uuid4()),  # Generate UUID for admin
                'email': admin_email,
                'full_name': 'Admin User',
                'role': 'admin'
            }).execute()
            print("✅ Admin user created in user_profiles table")
        else:
            print("✅ Admin user already exists in user_profiles table")
    except Exception as e:
        print(f"⚠️ Admin user setup: {e}")
        print("📝 Please check if the user_profiles table exists in public schema")

def check_supabase_storage():
    """Check Supabase storage configuration and permissions for anon key"""
    try:
        print("🔍 Testing Supabase storage configuration with anon key...")
        
        # Test storage bucket access
        try:
            # Try to list files in lab-analysis bucket
            result = supabase.storage.from_("lab-analysis").list()
            print("✅ Successfully accessed lab-analysis bucket")
            print(f"📊 Bucket contains {len(result)} files/folders")
        except Exception as e:
            print(f"❌ Failed to access lab-analysis bucket: {e}")
            print("📝 Please check:")
            print("   1. Bucket 'lab-analysis' exists in Supabase")
            print("   2. Bucket is public or has proper RLS policies")
            print("   3. Your anon key has storage permissions")
            print("   4. Storage policies allow anon access")
        
        # Test storage permissions
        try:
            # Try to get bucket info
            bucket_info = supabase.storage.get_bucket("lab-analysis")
            print("✅ Successfully retrieved bucket information")
            print(f"📊 Bucket public: {bucket_info.public}")
        except Exception as e:
            print(f"❌ Failed to get bucket info: {e}")
        
        # Test upload permissions with a small test file
        try:
            test_content = b"test file content"
            test_path = f"test-upload-{uuid.uuid4()}.txt"
            
            print(f"🔍 Testing upload with path: {test_path}")
            
            upload_result = supabase.storage.from_("lab-analysis").upload(
                path=test_path,
                file=test_content,
                file_options={"content-type": "text/plain"}
            )
            
            if hasattr(upload_result, 'error') and upload_result.error:
                print(f"❌ Test upload failed: {upload_result.error}")
                print("📝 This indicates storage permission issues with anon key")
            else:
                print("✅ Test upload successful with anon key")
                
                # Clean up test file
                try:
                    supabase.storage.from_("lab-analysis").remove([test_path])
                    print("✅ Test file cleaned up")
                except Exception as cleanup_error:
                    print(f"⚠️ Failed to cleanup test file: {cleanup_error}")
                    
        except Exception as e:
            print(f"❌ Test upload failed: {e}")
            print("📝 This indicates storage permission issues with anon key")
            print("📝 Please check your Supabase storage policies")
            
    except Exception as e:
        print(f"❌ Storage configuration check failed: {e}")

def validate_supabase_credentials():
    """Validate Supabase credentials and configuration"""
    print("🔍 Validating Supabase credentials...")
    
    # Check environment variables
    print(f"📝 SUPABASE_URL: {'✅ Set' if SUPABASE_URL and SUPABASE_URL != 'your_supabase_url_here' else '❌ Not set'}")
    print(f"📝 SUPABASE_ANON_KEY: {'✅ Set' if SUPABASE_ANON_KEY and SUPABASE_ANON_KEY != 'your_supabase_anon_key_here' else '❌ Not set'}")
    
    # Check URL format
    if SUPABASE_URL and 'supabase.co' in SUPABASE_URL:
        print("✅ Supabase URL format looks correct")
    else:
        print("❌ Supabase URL format may be incorrect")
    
    # Check key format
    if SUPABASE_ANON_KEY and len(SUPABASE_ANON_KEY) > 50:
        print("✅ Supabase key format looks correct")
    else:
        print("❌ Supabase key format may be incorrect")
    
    # Test basic connection
    try:
        result = supabase.table('inspection').select('*').limit(1).execute()
        print("✅ Basic Supabase connection successful")
    except Exception as e:
        print(f"❌ Basic Supabase connection failed: {e}")
        print("📝 Please check your credentials and network connection")

# Initialize database
init_db()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Backend is running with Supabase"})

@app.route('/api/ocr-status', methods=['GET'])
def ocr_status():
    """OCR integration status endpoint for debugging"""
    print("🔍 OCR STATUS: Checking OCR integration status...")
    
    status = {
        "vision_client_available": bool(ocr_integration.vision_client),
        "openai_client_available": bool(ocr_integration.openai_client), 
        "integration_available": ocr_integration.is_available,
        "google_credentials_env": bool(os.getenv('GOOGLE_APPLICATION_CREDENTIALS')),
        "google_credentials_path": os.getenv('GOOGLE_APPLICATION_CREDENTIALS'),
        "openai_api_key_configured": bool(OPENAI_API_KEY)
    }
    
    # Check if credentials file exists
    creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if creds_path:
        status["credentials_file_exists"] = os.path.exists(creds_path)
        if os.path.exists(creds_path):
            try:
                with open(creds_path, 'r') as f:
                    import json
                    creds = json.load(f)
                    status["credentials_valid_json"] = True
                    status["service_account_type"] = creds.get('type') == 'service_account'
                    status["project_id"] = creds.get('project_id', 'unknown')
            except Exception as e:
                status["credentials_valid_json"] = False
                status["credentials_error"] = str(e)
    
    print(f"🔍 OCR STATUS: Returning status: {status}")
    return jsonify(status)

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    print(f"🔍 DEBUG: Login request received")
    data = request.get_json()
    print(f"🔍 DEBUG: Request data: {data}")
    
    email = data.get('email')
    password = data.get('password')
    
    print(f"🔍 DEBUG: Email: {email}, Password provided: {bool(password)}")
    
    if not email or not password:
        print(f"🔍 DEBUG: Missing email or password")
        return jsonify({"error": "Email and password required"}), 400
    
    try:
        # Check if user exists in user_profiles table
        result = supabase.table('user_profiles').select('*').eq('email', email).execute()
        user = result.data[0] if result.data else None
        
        print(f"🔍 DEBUG: User found: {user}")
        
        if user:
            # For demo purposes, accept any password
            # In production, you would verify the password against auth.users table
            
            # Generate simple token (in production, use JWT)
            token = secrets.token_urlsafe(32)
            response_data = {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": user['id'],
                    "email": user['email'],
                    "full_name": user.get('full_name', ''),
                    "is_admin": user.get('role') == 'admin'
                }
            }
            print(f"🔍 DEBUG: Returning success response: {response_data}")
            return jsonify(response_data)
        else:
            print(f"🔍 DEBUG: User not found")
            return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        print(f"🔍 DEBUG: Database error: {e}")
        return jsonify({"error": "Database error"}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """User registration endpoint"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    try:
        # Check if user already exists in user_profiles table
        existing_user = supabase.table('user_profiles').select('*').eq('email', email).execute()
        if existing_user.data:
            return jsonify({"error": "Email already exists"}), 400
        
        # Insert new user in user_profiles table
        result = supabase.table('user_profiles').insert({
            'id': str(uuid.uuid4()),
            'email': email,
            'full_name': email.split('@')[0],  # Use email prefix as name
            'role': 'user'
        }).execute()
        
        user_id = result.data[0]['id'] if result.data else None
        
        return jsonify({
            "message": "User registered successfully",
            "user_id": user_id
        })
    except Exception as e:
        print(f"🔍 DEBUG: Registration error: {e}")
        return jsonify({"error": "Registration failed"}), 500

@app.route('/api/inspection', methods=['GET'])
def get_inspections():
    """Get all inspections with complete data"""
    try:
        # Get query parameters
        sort_by = request.args.get('sort', '-created_at')
        limit = request.args.get('limit', 10)
        email = request.args.get('email')
        
        # Check if user is admin
        is_admin = email == 'rotemiluz53@gmail.com'
        
        print(f"🔍 DEBUG: Fetching inspections with sort={sort_by}, limit={limit}, is_admin={is_admin}")
        
        # Build the query - explicitly select ALL fields including lab_analysis_images and mold_images
        # Using * should include all columns, but let's be explicit about the image fields we need
        query = supabase.table('inspection').select('*')
        
        # Apply sorting - handle different sort fields
        if sort_by:
            if sort_by == '-created_date':
                query = query.order('created_date', desc=True)
            elif sort_by == '-created_at':
                query = query.order('created_at', desc=True)
            elif sort_by.startswith('-'):
                # Handle other descending sorts
                field = sort_by[1:]
                query = query.order(field, desc=True)
            else:
                query = query.order(sort_by)
        
        # Apply limit only for non-admin users
        if limit and not is_admin:
            query = query.limit(int(limit))

        print(f"🔍 DEBUG: Executing query...")
        result = query.execute()
        inspections = result.data
        print(f"🔍 DEBUG: Found {len(inspections)} inspections")
        
        # Debug the first inspection to see what fields are available
        if inspections and len(inspections) > 0:
            first_inspection = inspections[0]
            print(f"🔍 DEBUG: First inspection available fields: {list(first_inspection.keys())}")
            print(f"🔍 DEBUG: First inspection lab_analysis_images: {first_inspection.get('lab_analysis_images')}")
            print(f"🔍 DEBUG: First inspection mold_images: {first_inspection.get('mold_images')}")

        # Filter by email if provided
        if email:
            inspections = [i for i in inspections if i.get('email') == email]

        # Convert to expected format with ALL available fields
        result_list = []
        for inspection in inspections:
            print(f"🔍 DEBUG: Processing inspection {inspection.get('id')} - lab_analysis_images: {inspection.get('lab_analysis_images')}, mold_images: {inspection.get('mold_images')}")
            result_list.append({
                # Basic identification
                "id": inspection['id'],
                "inspection_number": inspection.get('id'),
                "created_at": inspection['created_at'],
                "created_date": inspection.get('created_date'),
                "updated_date": inspection.get('updated_date'),
                "created_by_id": inspection.get('created_by_id'),
                
                # Client information
                "full_name": inspection.get('full_name'),
                "email": inspection.get('email'),
                "client_type": inspection.get('client_type'),
                
                # Property information
                "street_address": inspection.get('street_address'),
                "city": inspection.get('city'),
                "state": inspection.get('state'),
                "zip_code": inspection.get('zip_code'),
                "property_type": inspection.get('property_type'),
                "square_footage": inspection.get('square_footage'),
                
                # Mold assessment
                "has_visible_mold": inspection.get('has_visible_mold'),
                "mold_locations": inspection.get('mold_locations'),
                "mold_images": inspection.get('mold_images'),
                
                # Water damage assessment
                "has_water_damage": inspection.get('has_water_damage'),
                "water_damage_locations": inspection.get('water_damage_locations'),
                "water_damage_images": inspection.get('water_damage_images'),
                
                # Environmental data
                "thermostat_image": inspection.get('thermostat_image'),
                
                # Lab analysis data (ensure both column names are handled)
                "lab_analysis_images": inspection.get('lab_analysis_images') or inspection.get('mold_images'),
                
                # Status and metadata
                "status": inspection.get('status', 'pending'),
                "is_sample": inspection.get('is_sample'),
                
                # Legacy fields for compatibility
                "user_id": inspection.get('created_by_id'),
                "property_address": inspection.get('street_address', ''),
                "inspection_date": inspection.get('created_date'),
                "summary": f"Inspection for {inspection.get('full_name', 'Unknown')}",
                "user_email": inspection.get('email'),
            })
            
            # Log what we're returning for this inspection
            final_lab_images = result_list[-1]['lab_analysis_images']
            print(f"🔍 DEBUG: Returning for inspection {inspection.get('id')} - final lab_analysis_images: {final_lab_images}")
        
        print(f"🔍 DEBUG: Returning {len(result_list)} inspections with complete data")
        return jsonify(result_list)
    except Exception as e:
        print(f"🔍 DEBUG: Get inspections error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch inspections: {str(e)}"}), 500

@app.route('/api/inspection/<int:inspection_id>', methods=['GET'])
def get_inspection_by_id(inspection_id):
    """Get a single inspection by ID"""
    try:
        print(f"🔍 DEBUG: Getting inspection with ID: {inspection_id}")
        
        result = supabase.table('inspection').select('*').eq('id', inspection_id).execute()
        inspections = result.data
        
        if inspections and len(inspections) > 0:
            inspection = inspections[0]
            print(f"🔍 DEBUG: Found inspection - ID: {inspection.get('id')}")
            print(f"🔍 DEBUG: lab_analysis_images field: {inspection.get('lab_analysis_images')}")
            print(f"🔍 DEBUG: mold_images field: {inspection.get('mold_images')}")
            print(f"🔍 DEBUG: All available fields: {list(inspection.keys())}")
            return jsonify(inspection)
        else:
            print(f"🔍 DEBUG: No inspection found with ID: {inspection_id}")
            return jsonify({"error": "Inspection not found"}), 404
            
    except Exception as e:
        print(f"🔍 DEBUG: Get inspection by ID error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch inspection: {str(e)}"}), 500

@app.route('/api/inspection', methods=['POST'])
def create_inspection():
    """Create new inspection"""
    data = request.get_json()
    
    print(f"🔍 DEBUG: Creating inspection with data:", data)
    
    try:
        # Prepare data for insertion using actual database column names
        inspection_data = {
            'full_name': data.get('full_name'),
            'street_address': data.get('street_address'),
            'city': data.get('city'),
            'state': data.get('state'),
            'zip_code': data.get('zip_code'),
            'property_type': data.get('property_type'),
            'client_type': data.get('client_type'),
            'square_footage': data.get('square_footage'),
            'has_visible_mold': data.get('has_visible_mold'),
            'has_water_damage': data.get('has_water_damage'),
            'status': data.get('status', 'pending'),
            'created_by_id': data.get('created_by'),
            'email': data.get('email'),
            'is_sample': data.get('is_sample', False),
            'created_date': data.get('created_date')
        }
        
        # Handle image fields using correct database column names
        if 'visible_mold_details' in data and data['visible_mold_details']:
            # Map visible_mold_details to mold_locations (which stores the array with images)
            inspection_data['mold_locations'] = json.dumps(data['visible_mold_details'])
            print(f"🔍 DEBUG: Serializing visible_mold_details to mold_locations: {len(data['visible_mold_details'])} entries")
        
        if 'water_damage_details' in data and data['water_damage_details']:
            # Map water_damage_details to water_damage_locations
            inspection_data['water_damage_locations'] = json.dumps(data['water_damage_details'])
            print(f"🔍 DEBUG: Serializing water_damage_details to water_damage_locations: {len(data['water_damage_details'])} entries")
        
        # Handle individual image fields
        if 'thermostat_image' in data and data['thermostat_image']:
            inspection_data['thermostat_image'] = data['thermostat_image']
            
        # Note: lab_analysis_images will be handled by the separate upload endpoint
        
        print(f"🔍 DEBUG: Final inspection data for insert:", inspection_data)
        
        result = supabase.table('inspection').insert(inspection_data).execute()
        
        print(f"🔍 DEBUG: Supabase result:", result)
        print(f"🔍 DEBUG: Result data:", result.data)
        
        inspection = result.data[0] if result.data else None
        print(f"🔍 DEBUG: Extracted inspection:", inspection)
        
        response_data = {
            "message": "Inspection created successfully",
            "inspection": inspection
        }
        print(f"🔍 DEBUG: Returning response:", response_data)
        
        return jsonify(response_data)
    except Exception as e:
        print(f"🔍 DEBUG: Create inspection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to create inspection: {str(e)}"}), 500

@app.route('/api/inspection/<int:inspection_id>', methods=['PUT'])
def update_inspection(inspection_id):
    """Update inspection"""
    data = request.get_json()
    
    print(f"🔍 DEBUG: Updating inspection {inspection_id} with data:", data)
    
    try:
        # Build update data dynamically based on what's provided
        update_data = {}
        if 'status' in data:
            update_data['status'] = data['status']
        if 'property_address' in data:
            update_data['property_address'] = data['property_address']
        if 'inspection_date' in data:
            update_data['inspection_date'] = data['inspection_date']
        if 'summary' in data:
            update_data['summary'] = data['summary']
        if 'has_visible_mold' in data:
            update_data['has_visible_mold'] = data['has_visible_mold']
        if 'has_water_damage' in data:
            update_data['has_water_damage'] = data['has_water_damage']
        if 'is_sample' in data:
            update_data['is_sample'] = data['is_sample']
        
        # Handle image fields using correct database column names
        if 'lab_analysis_images' in data:
            if isinstance(data['lab_analysis_images'], list):
                update_data['lab_analysis_images'] = data['lab_analysis_images']  # Store as PostgreSQL array
                print(f"🔍 DEBUG: Storing lab_analysis_images as PostgreSQL array: {len(data['lab_analysis_images'])} images")
            else:
                update_data['lab_analysis_images'] = data['lab_analysis_images']
        
        if 'visible_mold_details' in data:
            # Map visible_mold_details to mold_locations database column
            if isinstance(data['visible_mold_details'], list):
                update_data['mold_locations'] = json.dumps(data['visible_mold_details'])
                print(f"🔍 DEBUG: Serializing visible_mold_details to mold_locations: {len(data['visible_mold_details'])} entries")
            else:
                update_data['mold_locations'] = data['visible_mold_details']
        
        if 'water_damage_details' in data:
            # Map water_damage_details to water_damage_locations database column
            if isinstance(data['water_damage_details'], list):
                update_data['water_damage_locations'] = json.dumps(data['water_damage_details'])
                print(f"🔍 DEBUG: Serializing water_damage_details to water_damage_locations: {len(data['water_damage_details'])} entries")
            else:
                update_data['water_damage_locations'] = data['water_damage_details']
        
        if 'thermostat_image' in data:
            update_data['thermostat_image'] = data['thermostat_image']
            print(f"🔍 DEBUG: Updating thermostat_image: {data['thermostat_image']}")
        
        # Handle text fields (only if they exist in database schema)
        # NOTE: conclusion and recommendations columns don't exist in current database schema
        # Remove these to prevent PGRST204 "column not found" errors
        # if 'conclusion' in data:
        #     update_data['conclusion'] = data['conclusion']
        # if 'recommendations' in data:
        #     update_data['recommendations'] = data['recommendations']
        
        print(f"🔍 DEBUG: Update data to apply:", update_data)
        
        result = supabase.table('inspection').update(update_data).eq('id', inspection_id).execute()
        
        updated_inspection = result.data[0] if result.data else None
        print(f"🔍 DEBUG: Updated inspection:", updated_inspection)
        
        return jsonify({
            "message": "Inspection updated successfully",
            "inspection": updated_inspection
        })
    except Exception as e:
        print(f"🔍 DEBUG: Update inspection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to update inspection: {str(e)}"}), 500

@app.route('/api/inspection/<int:inspection_id>', methods=['DELETE'])
def delete_inspection(inspection_id):
    """Delete inspection"""
    try:
        print(f"🔍 DEBUG: Deleting inspection with ID: {inspection_id}")
        
        result = supabase.table('inspection').delete().eq('id', inspection_id).execute()
        
        print(f"🔍 DEBUG: Delete result:", result)
        
        return jsonify({
            "message": "Inspection deleted successfully"
        })
    except Exception as e:
        print(f"🔍 DEBUG: Delete inspection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to delete inspection: {str(e)}"}), 500

@app.route('/api/samples', methods=['GET'])
def get_samples():
    """Get all samples"""
    inspection_id = request.args.get('inspection_id')
    
    try:
        if inspection_id:
            result = supabase.table('samples').select('*').eq('inspection_id', inspection_id).execute()
        else:
            result = supabase.table('samples').select('*').execute()
        
        samples = result.data
        
        # Convert to expected format
        result_list = []
        for sample in samples:
            result_list.append({
                "id": sample['id'],
                "inspection_id": sample['inspection_id'],
                "sample_type": sample.get('description', ''),  # Use description as sample_type
                "location": sample.get('location'),
                "notes": sample.get('description'),
                "sample_image": sample.get('sample_image'),
                "created_at": sample['created_at']
            })
        
        return jsonify(result_list)
    except Exception as e:
        print(f"🔍 DEBUG: Get samples error: {e}")
        return jsonify({"error": "Failed to fetch samples"}), 500

@app.route('/api/samples', methods=['POST'])
def create_sample():
    """Create new sample"""
    data = request.get_json()
    
    try:
        result = supabase.table('samples').insert({
            'inspection_id': data.get('inspection_id'),
            'location': data.get('location'),
            'description': data.get('sample_type') or data.get('notes'),
            'sample_image': data.get('sample_image')
        }).execute()
        
        sample = result.data[0] if result.data else None
        
        return jsonify({
            "message": "Sample created successfully",
            "sample": sample
        })
    except Exception as e:
        print(f"🔍 DEBUG: Create sample error: {e}")
        return jsonify({"error": "Failed to create sample"}), 500

@app.route('/api/llm/summarize', methods=['POST'])
def llm_summarize():
    """LLM summarization endpoint (mock)"""
    data = request.get_json()
    text = data.get('text', '') if data else ''
    
    # Mock LLM response
    summary = f"Summary of inspection: {text[:100]}... (Mock LLM response)"
    
    return jsonify({
        "summary": summary,
        "model": "gpt-4-mock"
    })

@app.route('/api/validate-lab-image-file', methods=['POST'])
def validate_lab_image_file():
    """Validate a lab analysis image file using OCR before uploading to storage"""
    print("🔍 VALIDATE FILE: Starting lab image file validation...")
    
    try:
        # Check if file is present in request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided", "valid": False}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected", "valid": False}), 400
        
        print(f"🔍 VALIDATE FILE: Validating file: {file.filename}")
        
        # Read file content
        file_content = file.read()
        if not file_content:
            return jsonify({"error": "Empty file", "valid": False}), 400
        
        # Reset file pointer for potential reuse
        file.seek(0)
        
        print(f"🔍 VALIDATE FILE: File size: {len(file_content)} bytes")
        
        # Always attempt Google Vision API call - no fallback logic
        try:
            # Ensure Vision client is available
            if not ocr_integration.vision_client:
                logger.error("❌ Google Vision API client is None - check credentials configuration")
                raise Exception("Google Vision API client not initialized. Please verify GOOGLE_APPLICATION_CREDENTIALS environment variable and credentials file exist.")
            
            from google.cloud import vision
            image = vision.Image(content=file_content)
            
            # Configure text detection with language hints
            image_context = vision.ImageContext(language_hints=OCR_SUPPORTED_LANGUAGES)
            
            # Always perform real Google Vision API text detection call
            print(f"🔍 VALIDATE FILE: Making Google Vision API text_detection call for file: {file.filename}")
            response = ocr_integration.vision_client.text_detection(image=image, image_context=image_context)
            texts = response.text_annotations
            
            if response.error.message:
                logger.error(f"❌ Google Vision API returned error: {response.error.message}")
                raise Exception(f"Google Vision API error: {response.error.message}")
            
            # Extract full text
            extracted_text = texts[0].description if texts else ""
            
            print(f"✅ VALIDATE FILE: Google Vision API successfully extracted {len(extracted_text)} characters from file")
            
            # Consider image valid if we extracted any text
            is_valid = len(extracted_text.strip()) > 0
            
            print(f"✅ VALIDATE FILE: Processing complete - Valid: {is_valid}, Text length: {len(extracted_text)}")
            
            return jsonify({
                "valid": is_valid,
                "extracted_text": extracted_text,
                "confidence": "high" if len(extracted_text) > 50 else "medium",
                "message": "Image processed successfully" if is_valid else "No text detected in image"
            }), 200
            
        except Exception as ocr_error:
            logger.error(f"❌ VALIDATE FILE: Google Vision API call failed: {ocr_error}")
            print(f"❌ VALIDATE FILE: Google Vision API processing failed: {ocr_error}")
            return jsonify({
                "valid": False,
                "error": f"Google Vision API call failed: {str(ocr_error)}",
                "extracted_text": "",
                "message": "Manual review required - Google Vision API call failed"
            }), 200
        
    except Exception as e:
        print(f"❌ VALIDATE FILE: Error: {str(e)}")
        return jsonify({
            "valid": False,
            "error": str(e),
            "extracted_text": ""
        }), 500

@app.route('/api/validate-lab-image', methods=['POST'])
def validate_lab_image():
    """Validate a lab analysis image using OCR before saving to database (legacy URL method)"""
    print("🔍 VALIDATE IMAGE: Starting lab image validation...")
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided", "valid": False}), 400
        
        image_url = data.get('image_url')
        if not image_url:
            return jsonify({"error": "No image URL provided", "valid": False}), 400
        
        print(f"🔍 VALIDATE IMAGE: Validating image at URL: {image_url}")
        
        # Use OCR to validate the image can be processed
        ocr_result = ocr_integration.extract_text_from_image_url(image_url)
        
        if 'error' in ocr_result:
            print(f"❌ VALIDATE IMAGE: OCR validation failed: {ocr_result['error']}")
            return jsonify({
                "valid": False,
                "error": ocr_result['error'],
                "extracted_text": ""
            }), 200
        
        extracted_text = ocr_result.get('extracted_text', '')
        
        # Consider image valid if we extracted any text
        is_valid = len(extracted_text.strip()) > 0
        
        print(f"✅ VALIDATE IMAGE: Validation complete - Valid: {is_valid}, Text length: {len(extracted_text)}")
        
        return jsonify({
            "valid": is_valid,
            "extracted_text": extracted_text,
            "confidence": ocr_result.get('confidence', 'unknown'),
            "message": "Image processed successfully" if is_valid else "No text detected in image"
        }), 200
        
    except Exception as e:
        print(f"❌ VALIDATE IMAGE: Error: {str(e)}")
        return jsonify({
            "valid": False,
            "error": str(e),
            "extracted_text": ""
        }), 500

@app.route('/api/ocr-gpt', methods=['POST'])
def ocr_gpt():
    """OCR-GPT endpoint for lab analysis with Google Cloud Vision integration"""
    print("🚀 BACKEND OCR: OCR-GPT endpoint called!")
    
    try:
        print("📦 BACKEND OCR: Getting request data...")
        data = request.get_json()
        
        if not data:
            print("❌ BACKEND OCR: No data provided in request")
            return jsonify({'error': 'No data provided'}), 400
        
        prompt = data.get('prompt', '')
        image_urls = data.get('image_urls', [])
        
        print("✅ BACKEND OCR: Request data parsed successfully")
        print(f"🔍 DEBUG: Prompt length: {len(prompt)}")
        print(f"🔍 DEBUG: Prompt preview: {prompt[:200]}...")
        print(f"🔍 DEBUG: Image URLs count: {len(image_urls)}")
        print(f"🔍 DEBUG: Image URLs: {image_urls}")
        print(f"🔍 DEBUG: OCR service available: {ocr_integration.is_available}")
        print(f"🔍 DEBUG: OCR integration type: {type(ocr_integration)}")
        
        if not image_urls:
            print("⚠️ BACKEND OCR: No image URLs provided")
        
        if not prompt:
            print("⚠️ BACKEND OCR: No prompt provided")
        
        # Process images for lab analysis
        print("🔍 BACKEND OCR: Checking if this is a lab analysis request...")
        is_lab_analysis = 'lab' in prompt.lower() or 'analysis' in prompt.lower()
        print(f"✅ BACKEND OCR: Lab analysis detected: {is_lab_analysis}")
        
        if is_lab_analysis:
            print("🔬 BACKEND OCR: This is a lab analysis request")
            print(f"🔍 DEBUG: Has image URLs: {bool(image_urls)}")
            print(f"🔍 DEBUG: OCR integration available: {ocr_integration.is_available}")
            
            if image_urls:
                # Always attempt real OCR processing for lab analysis - no fallback logic
                print("🔬 BACKEND OCR: Starting Google Cloud Vision OCR processing...")
                print(f"🔍 DEBUG: Will process {len(image_urls)} images")
                
                # Ensure Vision client is available
                if not ocr_integration.vision_client:
                    logger.error("❌ Google Vision API client not initialized")
                    return jsonify({
                        "error": "Google Vision API client not initialized. Please check your credentials and configuration.",
                        "content": "Manual review required - Google Vision API not available",
                        "analysis": "Manual review required - Google Vision API not available"
                    }), 500
                
                all_extracted_text = []
                ocr_results = []
                
                for i, image_url in enumerate(image_urls):
                    print(f"📸 BACKEND OCR: Processing image {i+1}/{len(image_urls)} with Google Vision API")
                    print(f"🔍 DEBUG: Image URL: {image_url}")
                    
                    try:
                        ocr_result = ocr_integration.extract_text_from_image_url(image_url)
                        ocr_results.append(ocr_result)
                        print(f"✅ BACKEND OCR: Google Vision API call completed for image {i+1}")
                        print(f"🔍 DEBUG: OCR result keys: {list(ocr_result.keys())}")
                    except Exception as img_error:
                        logger.error(f"❌ BACKEND OCR: Google Vision API call failed for image {i+1}: {img_error}")
                        print(f"❌ BACKEND OCR: Google Vision API error for image {i+1}: {img_error}")
                        ocr_results.append({"error": str(img_error), "extracted_text": ""})
                    
                    if 'extracted_text' in ocr_result and ocr_result['extracted_text']:
                        all_extracted_text.append(f"IMAGE {i+1}:\n{ocr_result['extracted_text']}")
                        print(f"✅ Google Vision API extracted {len(ocr_result['extracted_text'])} characters from image {i+1}")
                    else:
                        print(f"⚠️ Google Vision API returned no text for image {i+1}")
                
                # Combine all extracted text
                combined_text = "\n\n".join(all_extracted_text)
                
                if combined_text.strip():
                    # Analyze with GPT-4
                    print("🤖 Analyzing extracted text with GPT-4...")
                    print(f"📝 Extracted text preview: {combined_text[:200]}...")
                    
                    try:
                        gpt_result = ocr_integration.analyze_lab_results_with_gpt(combined_text, image_urls)
                        
                        print("✅ GPT-4 analysis completed")
                        print(f"📋 Conclusion preview: {gpt_result.get('conclusion', '')[:100]}...")
                        print(f"💡 Recommendations preview: {gpt_result.get('recommendations', '')[:100]}...")
                        
                        response = {
                            "content": gpt_result["analysis"],
                            "analysis": gpt_result["analysis"],
                            "conclusion": gpt_result.get("conclusion", ""),
                            "recommendations": gpt_result.get("recommendations", ""),
                            "extracted_text": combined_text,
                            "ocr_results": ocr_results,
                            "usage": {
                                "prompt_tokens": len(combined_text.split()) + len(prompt.split()),
                                "completion_tokens": len(gpt_result["analysis"].split()),
                                "total_tokens": len(combined_text.split()) + len(prompt.split()) + len(gpt_result["analysis"].split())
                            },
                            "model": "gpt-4-vision-ocr",
                            "images_processed": len(image_urls),
                            "timestamp": datetime.now().isoformat()
                        }
                        
                        print("✅ Real OCR lab analysis completed successfully")
                        return jsonify(response)
                        
                    except Exception as gpt_error:
                        logger.error(f"❌ GPT analysis failed after successful OCR: {gpt_error}")
                        print(f"❌ Error in GPT analysis: {gpt_error}")
                        return jsonify({
                            "error": f"GPT analysis failed after successful OCR: {str(gpt_error)}",
                            "content": "Manual review required - OCR successful but analysis failed",
                            "analysis": "Manual review required - OCR successful but analysis failed",
                            "extracted_text": combined_text,
                            "ocr_results": ocr_results,
                            "images_processed": len(image_urls)
                        }), 200
                
                else:
                    print("⚠️ Google Vision API returned no text from any images")
                    return jsonify({
                        "error": "No text detected in any images by Google Vision API",
                        "content": "Manual review required - no text detected by Google Vision API",
                        "analysis": "Manual review required - no text detected by Google Vision API", 
                        "extracted_text": "",
                        "ocr_results": ocr_results,
                        "images_processed": len(image_urls)
                    }), 200
            else:
                print("⚠️ No images provided for OCR processing")
                return jsonify({
                    "error": "No images provided",
                    "content": "Manual review required - no images provided",
                    "analysis": "Manual review required - no images provided"
                }), 400
        
        else:
            # General OCR processing
            content = f"""OCR analysis completed for the provided images.

Based on the prompt: "{prompt[:200]}..."

The system has processed {len(image_urls)} image(s) and extracted relevant information. For detailed analysis and professional recommendations, please review the findings and consider consulting with subject matter experts.

OCR Service Status: {'Available' if ocr_integration.is_available else 'Using fallback responses'}"""

            response = {
                "content": content,
                "analysis": content,
                "usage": {
                    "prompt_tokens": len(prompt.split()),
                    "completion_tokens": len(content.split()),
                    "total_tokens": len(prompt.split()) + len(content.split())
                },
                "model": "ocr-gpt-integrated",
                "images_processed": len(image_urls),
                "ocr_available": ocr_integration.is_available,
                "timestamp": datetime.now().isoformat()
            }
        
        print(f"✅ OCR-GPT response generated successfully")
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error in OCR-GPT endpoint: {str(e)}")
        logger.error(f"OCR-GPT endpoint error: {str(e)}", exc_info=True)
        return jsonify({
            "error": f"OCR-GPT processing failed: {str(e)}",
            "content": "Error processing request. Please try again or contact support.",
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "ocr_available": ocr_integration.is_available
        }), 500

@app.route('/api/email/send', methods=['POST'])
def send_email():
    """Email sending endpoint (mock)"""
    data = request.get_json()
    
    # Mock email sending
    return jsonify({
        "message": "Email sent successfully (mock)",
        "to": data.get('to'),
        "subject": data.get('subject')
    })

@app.route('/api/inspection/<int:inspection_id>/upload-lab-image', methods=['POST'])
def upload_lab_analysis_image(inspection_id):
    """
    Upload lab analysis image for an inspection with anon key authentication
    
    This endpoint:
    1. Validates authentication and file
    2. Uploads the image to Supabase lab-analysis bucket with anon key
    3. Gets the public URL of the uploaded image
    4. Adds the URL to the lab_analysis_images array in the inspection record
    5. Returns the uploaded image URL and inspection_id
    """
    try:
        # Check if inspection exists
        inspection_result = supabase.table('inspection').select('*').eq('id', inspection_id).execute()
        if not inspection_result.data:
            return jsonify({"error": f"Inspection with ID {inspection_id} not found"}), 404
        
        inspection = inspection_result.data[0]
        
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            return jsonify({"error": "Only image files are allowed"}), 400
        
        # Validate file size (max 10MB for anon key)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        max_size = 10 * 1024 * 1024  # 10MB
        if file_size > max_size:
            return jsonify({"error": "File size exceeds 10MB limit"}), 400
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create folder path: lab-analysis-images/inspection_{id}/
        folder_path = f"lab-analysis-images/inspection_{inspection_id}"
        file_path = f"{folder_path}/{unique_filename}"
        
        print(f"🔍 DEBUG: Uploading file to Supabase: {file_path}")
        print(f"🔍 DEBUG: File size: {file_size} bytes")
        print(f"🔍 DEBUG: Content type: {file.content_type}")
        
        # Read file content
        file_content = file.read()
        
        # Optimized upload for anon key authentication
        try:
            # Method 1: Standard upload with proper content-type
            upload_result = supabase.storage.from_("lab-analysis").upload(
                path=file_path,
                file=file_content,
                file_options={
                    "content-type": file.content_type,
                    "upsert": False  # Don't overwrite existing files
                }
            )
            
            if hasattr(upload_result, 'error') and upload_result.error:
                print(f"❌ Supabase upload error: {upload_result.error}")
                raise Exception(f"Upload failed: {upload_result.error}")
                
        except Exception as upload_error:
            print(f"❌ Primary upload method failed: {upload_error}")
            
            # Method 2: Try with corrected content-type detection
            try:
                # Determine correct content type
                content_type = file.content_type
                if not content_type or content_type == 'application/octet-stream':
                    # Try to detect content type from file extension
                    import mimetypes
                    content_type = mimetypes.guess_type(file.filename)[0] or 'image/jpeg'
                
                print(f"🔍 DEBUG: Retrying with content-type: {content_type}")
                
                upload_result = supabase.storage.from_("lab-analysis").upload(
                    path=file_path,
                    file=file_content,
                    file_options={
                        "content-type": content_type,
                        "upsert": True  # Allow overwrite for retry
                    }
                )
                
                if hasattr(upload_result, 'error') and upload_result.error:
                    raise Exception(f"Retry upload failed: {upload_result.error}")
                    
            except Exception as retry_error:
                print(f"❌ Retry upload method failed: {retry_error}")
                
                # Method 3: Try with different file path (avoid nested folders)
                try:
                    simple_path = f"inspection_{inspection_id}_{unique_filename}"
                    print(f"🔍 DEBUG: Trying simple path: {simple_path}")
                    
                    upload_result = supabase.storage.from_("lab-analysis").upload(
                        path=simple_path,
                        file=file_content,
                        file_options={
                            "content-type": file.content_type,
                            "upsert": True
                        }
                    )
                    
                    if hasattr(upload_result, 'error') and upload_result.error:
                        raise Exception(f"Simple path upload failed: {upload_result.error}")
                    
                    # Update file_path for URL generation
                    file_path = simple_path
                    
                except Exception as simple_error:
                    print(f"❌ Simple path upload failed: {simple_error}")
                    raise Exception(f"All upload methods failed. Last error: {str(simple_error)}")
        
        # Get public URL
        try:
            public_url = supabase.storage.from_("lab-analysis").get_public_url(file_path)
            print(f"✅ File uploaded successfully: {public_url}")
        except Exception as url_error:
            print(f"❌ Failed to get public URL: {url_error}")
            # Construct URL manually if get_public_url fails
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/lab-analysis/{file_path}"
            print(f"🔍 DEBUG: Using constructed URL: {public_url}")
        
        # Get current lab_analysis_images array - try lab_analysis_images first, then mold_images as fallback
        current_images = []
        lab_images_field = inspection.get('lab_analysis_images') or inspection.get('mold_images')
        if lab_images_field:
            # Handle both PostgreSQL array and JSON string formats
            if isinstance(lab_images_field, list):
                current_images = lab_images_field
            elif isinstance(lab_images_field, str):
                try:
                    current_images = json.loads(lab_images_field)
                except json.JSONDecodeError:
                    current_images = []
        
        # Check for duplicates before adding (prevent same image upload)
        if public_url in current_images:
            print(f"⚠️ Image already exists in array, skipping duplicate: {public_url}")
            return jsonify({
                "message": "Image already exists",
                "image_url": public_url,
                "inspection_id": inspection_id,
                "total_images": len(current_images),
                "duplicate": True
            })
        
        # Append new image URL to array
        current_images.append(public_url)
        print(f"🔍 DEBUG: Added new image to array. Total images: {len(current_images)}")
        
        # Update inspection record with PostgreSQL array format
        # Try updating with lab_analysis_images column, if it fails try with mold_images as fallback
        try:
            print(f"🔍 DEBUG: Attempting to update inspection {inspection_id} with lab_analysis_images array of {len(current_images)} items")
            
            # First try with lab_analysis_images column
            try:
                update_result = supabase.table('inspection').update({
                    'lab_analysis_images': current_images  # Store as PostgreSQL array, not JSON string
                }).eq('id', inspection_id).execute()
                print(f"🔍 DEBUG: Successfully updated lab_analysis_images column")
            except Exception as lab_error:
                print(f"⚠️ lab_analysis_images column not found, trying mold_images as fallback: {lab_error}")
                # Fallback to mold_images column if lab_analysis_images doesn't exist
                update_result = supabase.table('inspection').update({
                    'mold_images': current_images  # Store as PostgreSQL array in mold_images column
                }).eq('id', inspection_id).execute()
                print(f"🔍 DEBUG: Successfully updated mold_images column as fallback")
            
            print(f"🔍 DEBUG: Update result: {update_result}")
            
            if hasattr(update_result, 'error') and update_result.error:
                print(f"❌ Database update error: {update_result.error}")
                return jsonify({"error": f"Failed to update inspection: {update_result.error}"}), 500
                
        except Exception as db_error:
            print(f"❌ Database update exception: {db_error}")
            return jsonify({"error": f"Failed to update inspection: {str(db_error)}"}), 500
        
        print(f"✅ Inspection updated successfully with {len(current_images)} images")
        
        return jsonify({
            "message": "Lab analysis image uploaded successfully",
            "inspection_id": inspection_id,
            "image_url": public_url,
            "total_images": len(current_images),
            "file_path": file_path,
            "file_size": file_size,
            "content_type": file.content_type
        })
        
    except Exception as e:
        print(f"❌ Error in upload_lab_analysis_image: {e}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route('/api/inspection/<int:inspection_id>/lab-image/<int:image_index>', methods=['DELETE'])
def delete_lab_analysis_image(inspection_id, image_index):
    """
    Delete a specific lab analysis image from an inspection
    """
    try:
        # Check if inspection exists
        inspection_result = supabase.table('inspection').select('*').eq('id', inspection_id).execute()
        if not inspection_result.data:
            return jsonify({"error": f"Inspection with ID {inspection_id} not found"}), 404
        
        inspection = inspection_result.data[0]
        
        # Get current lab_analysis_images array - try lab_analysis_images first, then mold_images as fallback
        current_images = []
        lab_images_field = inspection.get('lab_analysis_images') or inspection.get('mold_images')
        if lab_images_field:
            # Handle both PostgreSQL array and JSON string formats
            if isinstance(lab_images_field, list):
                current_images = lab_images_field
            elif isinstance(lab_images_field, str):
                try:
                    current_images = json.loads(lab_images_field)
                except json.JSONDecodeError:
                    current_images = []
        
        # Validate image index
        if image_index < 0 or image_index >= len(current_images):
            return jsonify({"error": f"Image index {image_index} is out of range"}), 400
        
        # Get image URL to delete from storage
        image_url = current_images[image_index]
        
        # Extract file path from URL
        # URL format: https://xxx.supabase.co/storage/v1/object/public/lab-analysis/path/to/file
        url_parts = image_url.split("/lab-analysis/")
        if len(url_parts) != 2:
            return jsonify({"error": "Invalid file URL format"}), 400
        
        file_path = url_parts[1]
        
        print(f"🔍 DEBUG: Deleting file from Supabase: {file_path}")
        
        # Delete from Supabase Storage
        delete_result = supabase.storage.from_("lab-analysis").remove([file_path])
        
        if delete_result.error:
            print(f"❌ Supabase delete error: {delete_result.error}")
            return jsonify({"error": f"Delete failed: {delete_result.error}"}), 500
        
        # Remove from array
        current_images.pop(image_index)
        
        # Update inspection record - try lab_analysis_images first, fallback to mold_images
        try:
            update_result = supabase.table('inspection').update({
                'lab_analysis_images': current_images  # Store as PostgreSQL array, not JSON string
            }).eq('id', inspection_id).execute()
            print(f"🔍 DEBUG: Successfully updated lab_analysis_images column for deletion")
        except Exception as lab_error:
            print(f"⚠️ lab_analysis_images column not found for deletion, trying mold_images as fallback: {lab_error}")
            update_result = supabase.table('inspection').update({
                'mold_images': current_images  # Store as PostgreSQL array in mold_images column
            }).eq('id', inspection_id).execute()
            print(f"🔍 DEBUG: Successfully updated mold_images column as fallback for deletion")
        
        if hasattr(update_result, 'error') and update_result.error:
            print(f"❌ Database update error: {update_result.error}")
            return jsonify({"error": f"Failed to update inspection: {update_result.error}"}), 500
        
        print(f"✅ Image deleted successfully, {len(current_images)} images remaining")
        
        return jsonify({
            "message": "Lab analysis image deleted successfully",
            "inspection_id": inspection_id,
            "remaining_images": len(current_images)
        })
        
    except Exception as e:
        print(f"❌ Error in delete_lab_analysis_image: {e}")
        return jsonify({"error": f"Delete failed: {str(e)}"}), 500

if __name__ == '__main__':
    print("🚀 Starting Mold Testing Houston Backend...")
    print("📊 Database initialized with Supabase")
    
    # Show detailed OCR status after initialization
    print(f"\n🔬 OCR INTEGRATION FINAL STATUS:")
    print(f"   Vision Client: {'✅ Available' if ocr_integration.vision_client else '❌ Not initialized'}")
    print(f"   OpenAI Client: {'✅ Available' if ocr_integration.openai_client else '❌ Not initialized'}")
    print(f"   Integration Available: {'✅ Ready' if ocr_integration.is_available else '❌ Not ready'}")
    
    if ocr_integration.vision_client:
        print("   🎯 Google Vision API calls will be REAL")
    else:
        print("   ⚠️  Google Vision API calls will FAIL - check credentials")
        
    # Show current environment variable status
    creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    print(f"   Current GOOGLE_APPLICATION_CREDENTIALS: {creds_path}")
    if creds_path and os.path.exists(creds_path):
        print(f"   ✅ Credentials file exists and is accessible")
    elif creds_path:
        print(f"   ❌ Credentials file does not exist at specified path")
    else:
        print(f"   ❌ GOOGLE_APPLICATION_CREDENTIALS environment variable not set")
    
    # Run validation checks
    validate_supabase_credentials()
    check_supabase_storage()
    
    print("🔗 API available at: http://localhost:5000")
    print("📖 Health check: http://localhost:5000/health")
    print("📚 API endpoints:")
    print("   - POST /api/auth/login")
    print("   - POST /api/auth/register")
    print("   - GET  /api/inspection")
    print("   - POST /api/inspection")
    print("   - GET  /api/inspection/<int:inspection_id>")
    print("   - PUT  /api/inspection/<int:inspection_id>")
    print("   - DELETE /api/inspection/<int:inspection_id>")
    print("   - POST /api/inspection/<int:inspection_id>/upload-lab-image")
    print("   - DELETE /api/inspection/<int:inspection_id>/lab-image/<int:image_index>")
    print("   - GET  /api/samples")
    print("   - POST /api/samples")
    print("   - POST /api/llm/summarize")
    print("   - POST /api/validate-lab-image-file (OCR validation of files before storage upload)")
    print("   - POST /api/validate-lab-image (OCR validation before database save)")
    print("   - POST /api/ocr-gpt (Google Cloud Vision integration)")
    print("   - POST /api/email/send")
    print("\n💡 Default admin user: rotemiluz53@gmail.com / admin123")
    print(f"🔬 OCR Final Status: {'✅ Real Google Cloud Vision READY' if ocr_integration.is_available else '❌ OCR NOT AVAILABLE - check credentials and setup above'}")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 