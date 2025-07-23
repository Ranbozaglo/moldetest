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
from config import SUPABASE_URL, SUPABASE_ANON_KEY, validate_config
import uuid
from werkzeug.utils import secure_filename
import mimetypes

app = Flask(__name__)
CORS(app)

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
        
        # Build the query - select ALL fields from inspection table
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

        # Filter by email if provided
        if email:
            inspections = [i for i in inspections if i.get('email') == email]

        # Convert to expected format with ALL available fields
        result_list = []
        for inspection in inspections:
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
            print(f"🔍 DEBUG: Found inspection: {inspection}")
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
        result = supabase.table('inspection').insert({
            'full_name': data.get('full_name'),
            'street_address': data.get('street_address'),
            'city': data.get('city'),
            'state': data.get('state'),
            'zip_code': data.get('zip_code'),
            'property_type': data.get('property_type'),
            'client_type': data.get('client_type'),
            'square_footage': data.get('square_footage'),
            'has_visible_mold': data.get('has_visible_mold'),
            'mold_locations': data.get('mold_locations'),
            'has_water_damage': data.get('has_water_damage'),
            'water_damage_locations': data.get('water_damage_locations'),
            'status': data.get('status', 'pending'),
            'created_by_id': data.get('user_id'),
            'email': data.get('email'),
            'is_sample': data.get('is_sample', False)
        }).execute()
        
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

@app.route('/api/ocr-gpt', methods=['POST'])
def ocr_gpt():
    """OCR-GPT endpoint for image analysis (mock implementation)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        prompt = data.get('prompt', '')
        image_urls = data.get('image_urls', [])
        
        print(f"🔍 OCR-GPT called with prompt: {prompt[:100]}...")
        print(f"🔍 OCR-GPT image URLs: {image_urls}")
        
        # Mock OCR-GPT analysis response
        if 'lab' in prompt.lower() or 'analysis' in prompt.lower():
            content = """Based on the laboratory analysis, the following observations can be made:

**CONCLUSION:**
The submitted samples show varying levels of mold activity. The analysis indicates the presence of common environmental molds typically found in indoor environments. The concentration levels observed are within ranges that suggest localized moisture issues that should be addressed promptly.

**RECOMMENDATIONS:**
1. **Immediate Actions:** Address any visible water damage or moisture sources in the tested areas
2. **Preventive Measures:** Improve ventilation and maintain humidity levels below 60%
3. **Professional Services:** Consider consultation with a certified mold remediation specialist for affected areas
4. **Timeline:** Address moisture sources within 24-48 hours to prevent further growth
5. **Environmental Controls:** Install dehumidifiers and ensure proper HVAC maintenance

Note: This is a preliminary analysis. For comprehensive evaluation, professional inspection is recommended."""
        else:
            content = f"""OCR analysis completed for the provided images.

Based on the prompt: "{prompt[:200]}..."

The system has processed {len(image_urls)} image(s) and extracted relevant information. For detailed analysis and professional recommendations, please review the findings and consider consulting with subject matter experts.

This is a mock response - full OCR-GPT functionality requires additional configuration."""

        response = {
            "content": content,
            "analysis": content,
            "usage": {
                "prompt_tokens": len(prompt.split()) * 1.3,
                "completion_tokens": len(content.split()),
                "total_tokens": len(prompt.split()) * 1.3 + len(content.split())
            },
            "model": "ocr-gpt-mock",
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"✅ OCR-GPT response generated successfully")
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error in OCR-GPT endpoint: {str(e)}")
        return jsonify({
            "error": f"OCR-GPT processing failed: {str(e)}",
            "content": "Error processing request. Please try again or contact support.",
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
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
        
        # Get current lab_analysis_images array
        current_images = []
        if inspection.get('lab_analysis_images'):
            try:
                current_images = json.loads(inspection['lab_analysis_images'])
            except json.JSONDecodeError:
                current_images = []
        
        # Append new image URL to array
        current_images.append(public_url)
        
        # Update inspection record with new image array
        try:
            update_result = supabase.table('inspection').update({
                'lab_analysis_images': json.dumps(current_images)
            }).eq('id', inspection_id).execute()
            
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
        
        # Get current lab_analysis_images array
        current_images = []
        if inspection.get('lab_analysis_images'):
            try:
                current_images = json.loads(inspection['lab_analysis_images'])
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
        
        # Update inspection record
        update_result = supabase.table('inspection').update({
            'lab_analysis_images': json.dumps(current_images)
        }).eq('id', inspection_id).execute()
        
        if update_result.error:
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
    print("   - POST /api/ocr-gpt")
    print("   - POST /api/email/send")
    print("\n💡 Default admin user: rotemiluz53@gmail.com / admin123")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 