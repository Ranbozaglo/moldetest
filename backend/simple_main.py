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
        
        print(f"🔍 DEBUG: Fetching inspections with sort={sort_by}, limit={limit}")
        
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
        
        # Apply limit
        if limit:
            query = query.limit(int(limit))
        
        print(f"🔍 DEBUG: Executing query...")
        result = query.execute()
        inspections = result.data
        print(f"🔍 DEBUG: Found {len(inspections)} inspections")
        
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
    print("   - GET  /api/inspection/<int:inspection_id>")
    print("   - PUT  /api/inspection/<int:inspection_id>")
    print("   - DELETE /api/inspection/<int:inspection_id>")
    print("   - GET  /api/samples")
    print("   - POST /api/samples")
    print("   - POST /api/llm/summarize")
    print("   - POST /api/email/send")
    print("\n💡 Default admin user: rotemiluz53@gmail.com / admin123")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 