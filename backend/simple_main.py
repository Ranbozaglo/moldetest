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
    # Test connection to both schemas
    print("🔍 Testing connection to different schemas...")
    
    # Try public schema first
    try:
        supabase.table('api.inspection').select('*').limit(1).execute()
        print("✅ Supabase client initialized successfully with api schema")
    except Exception as e1:
        print(f"⚠️ Api schema test failed: {e1}")
        
        # Try public schema as fallback
        try:
            supabase.table('inspection').select('*').limit(1).execute()
            print("✅ Supabase client initialized successfully with public schema")
        except Exception as e2:
            print(f"⚠️ Public schema test failed: {e2}")
            raise Exception("Neither api nor public schema contains the inspection table")
            
except Exception as e:
    print(f"❌ Failed to initialize Supabase client: {e}")
    print("📝 Please check your Supabase URL and anon key in the .env file")
    print("📝 Make sure tables exist in either api or public schema")
    exit(1)

# Database setup
def init_db():
    """Initialize Supabase database tables in api schema"""
    try:
        # Test connection to api schema
        print("🔍 Testing connection to api schema...")
        supabase.table('api.inspection').select('*').limit(1).execute()
        print("✅ Successfully connected to api schema")
    except Exception as e:
        print(f"⚠️ Api schema connection test: {e}")
        print("📝 Make sure your tables are in the api schema")
    
    try:
        # Check inspection table (in api schema)
        print("🔍 Checking inspection table in api schema...")
        supabase.table('api.inspection').select('*').limit(1).execute()
        print("✅ Inspection table exists in api schema")
    except Exception as e:
        print(f"⚠️ Inspection table setup: {e}")
        print("📝 Please create the inspection table in the api schema")
    
    try:
        # Check samples table (in api schema)
        print("🔍 Checking samples table in api schema...")
        supabase.table('api.samples').select('*').limit(1).execute()
        print("✅ Samples table exists in api schema")
    except Exception as e:
        print(f"⚠️ Samples table setup: {e}")
        print("📝 Please create the samples table in the api schema")
    
    try:
        # Check user_profiles table (in api schema)
        print("🔍 Checking user_profiles table in api schema...")
        supabase.table('api.user_profiles').select('*').limit(1).execute()
        print("✅ User_profiles table exists in api schema")
    except Exception as e:
        print(f"⚠️ User_profiles table setup: {e}")
        print("📝 Please create the user_profiles table in the api schema")
    
    # Insert admin user if not exists (in api schema)
    admin_email = "rotemiluz53@gmail.com"
    admin_password = "admin123"  # In production, use proper password hashing
    admin_hash = hashlib.sha256(admin_password.encode()).hexdigest()
    
    try:
        # Check if admin user exists in user_profiles table
        result = supabase.table('api.user_profiles').select('*').eq('email', admin_email).execute()
        if not result.data:
            # Insert admin user in user_profiles table
            supabase.table('api.user_profiles').insert({
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
        print("📝 Please check if the user_profiles table exists in api schema")

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
        result = supabase.table('api.user_profiles').select('*').eq('email', email).execute()
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
        existing_user = supabase.table('api.user_profiles').select('*').eq('email', email).execute()
        if existing_user.data:
            return jsonify({"error": "Email already exists"}), 400
        
        # Insert new user in user_profiles table
        result = supabase.table('api.user_profiles').insert({
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
    """Get all inspections"""
    try:
        result = supabase.table('api.inspection').select('*, user_profiles(email, full_name)').execute()
        inspections = result.data
        
        # Convert to expected format
        result_list = []
        for inspection in inspections:
            result_list.append({
                "id": inspection['id'],
                "user_id": inspection.get('created_by_id'),
                "property_address": inspection.get('street_address', ''),
                "inspection_date": inspection.get('created_date'),
                "status": inspection.get('status', 'pending'),
                "summary": f"Inspection for {inspection.get('full_name', 'Unknown')}",
                "created_at": inspection['created_at'],
                "user_email": inspection.get('user_profiles', {}).get('email') if inspection.get('user_profiles') else None,
                "full_name": inspection.get('full_name'),
                "street_address": inspection.get('street_address'),
                "city": inspection.get('city'),
                "state": inspection.get('state'),
                "zip_code": inspection.get('zip_code'),
                "property_type": inspection.get('property_type'),
                "client_type": inspection.get('client_type'),
                "square_footage": inspection.get('square_footage'),
                "has_visible_mold": inspection.get('has_visible_mold'),
                "mold_locations": inspection.get('mold_locations'),
                "has_water_damage": inspection.get('has_water_damage'),
                "water_damage_locations": inspection.get('water_damage_locations'),
                "is_sample": inspection.get('is_sample')
            })
        
        return jsonify(result_list)
    except Exception as e:
        print(f"🔍 DEBUG: Get inspections error: {e}")
        return jsonify({"error": "Failed to fetch inspections"}), 500

@app.route('/api/inspection', methods=['POST'])
def create_inspection():
    """Create new inspection"""
    data = request.get_json()
    
    try:
        result = supabase.table('api.inspection').insert({
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
        
        inspection = result.data[0] if result.data else None
        
        return jsonify({
            "message": "Inspection created successfully",
            "inspection": inspection
        })
    except Exception as e:
        print(f"🔍 DEBUG: Create inspection error: {e}")
        return jsonify({"error": "Failed to create inspection"}), 500

@app.route('/api/inspections/<int:inspection_id>', methods=['PUT'])
def update_inspection(inspection_id):
    """Update inspection"""
    data = request.get_json()
    
    try:
        result = supabase.table('api.inspection').update({
            'property_address': data.get('property_address'),
            'inspection_date': data.get('inspection_date'),
            'status': data.get('status'),
            'summary': data.get('summary')
        }).eq('id', inspection_id).execute()
        
        updated_inspection = result.data[0] if result.data else None
        
        return jsonify({
            "message": "Inspection updated successfully",
            "inspection": updated_inspection
        })
    except Exception as e:
        print(f"🔍 DEBUG: Update inspection error: {e}")
        return jsonify({"error": "Failed to update inspection"}), 500

@app.route('/api/samples', methods=['GET'])
def get_samples():
    """Get all samples"""
    inspection_id = request.args.get('inspection_id')
    
    try:
        if inspection_id:
            result = supabase.table('api.samples').select('*').eq('inspection_id', inspection_id).execute()
        else:
            result = supabase.table('api.samples').select('*').execute()
        
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
        result = supabase.table('api.samples').insert({
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
    text = data.get('text', '')
    
    # Mock LLM response
    summary = f"Summary of inspection: {text[:100]}... (Mock LLM response)"
    
    return jsonify({
        "summary": summary,
        "model": "gpt-4-mock"
    })

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

if __name__ == '__main__':
    print("🚀 Starting Mold Testing Houston Backend...")
    print("📊 Database initialized with Supabase")
    print("🔗 API available at: http://localhost:5000")
    print("📖 Health check: http://localhost:5000/health")
    print("📚 API endpoints:")
    print("   - POST /api/auth/login")
    print("   - POST /api/auth/register")
    print("   - GET  /api/inspection")
    print("   - POST /api/inspection")
    print("   - GET  /api/samples")
    print("   - POST /api/samples")
    print("   - POST /api/llm/summarize")
    print("   - POST /api/email/send")
    print("\n💡 Default admin user: rotemiluz53@gmail.com / admin123")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 