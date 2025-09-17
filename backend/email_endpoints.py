from flask import jsonify, request
import sys
import os

# Add the current directory to the Python path to fix import issues
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Try to import email service, but make it optional for now
email_service = None
try:
    from app.services.email_service import email_service
    print("✅ EMAIL DEBUG: Email service imported successfully")
except ImportError as e:
    print(f"⚠️ EMAIL DEBUG: Could not import email service: {e}")
    # Create a mock email service for testing
    class MockEmailService:
        def send_lab_received_email_with_template(self, data):
            return {"success": True, "message": "Mock email sent"}
        def send_report_ready_email_with_template(self, data):
            return {"success": True, "message": "Mock email sent"}
        def send_review_request_email_with_template(self, data):
            return {"success": True, "message": "Mock email sent"}
        def send_inspection_created_email_with_template(self, data):
            return {"success": True, "message": "Mock email sent"}
        def get_templates(self):
            return {"default": "template"}
        def save_templates(self, templates):
            return {"success": True}
        def reset_templates(self):
            return {"success": True, "templates": {"default": "template"}}
    
    email_service = MockEmailService()
    print("✅ EMAIL DEBUG: Using mock email service for testing")

def register_email_endpoints(app, supabase):
    """Register email endpoints with the Flask app"""
    
    # Add a test endpoint to verify the function is working
    @app.route('/api/email/test', methods=['GET'])
    def test_email_endpoint():
        """Test endpoint to verify email endpoints are working"""
        return jsonify({
            "message": "Email endpoints are working",
            "email_service_available": email_service is not None,
            "supabase_available": supabase is not None
        })
    
    def get_inspection_data(inspection_id):
        """Helper function to get inspection data from either mold or asbestos table"""
        print(f"🔍 EMAIL DEBUG: Looking for inspection {inspection_id} in both tables")
        
        # Try to fetch inspection data - first by ID, then by inspection_number
        result = None
        inspection_type = None
        table_name = None
        
        # Try as numeric ID first
        inspection_id_str = str(inspection_id)
        print(f"🔍 EMAIL DEBUG: Looking for inspection with id = {inspection_id}")
        
        # Try mold inspection table first
        try:
            result = supabase.table('inspection').select('*').eq('id', inspection_id).single().execute()
            if result and result.data:
                inspection_type = 'mold'
                table_name = 'inspection'
                print(f"🔍 EMAIL DEBUG: Found mold inspection with id = {inspection_id}")
        except Exception as e:
            print(f"🔍 EMAIL DEBUG: Search by ID in mold table failed: {e}")
        
        # If not found in mold table, try asbestos table
        if not result or not result.data:
            try:
                result = supabase.table('asbestosinspection').select('*').eq('id', inspection_id).single().execute()
                if result and result.data:
                    inspection_type = 'asbestos'
                    table_name = 'asbestosinspection'
                    print(f"🔍 EMAIL DEBUG: Found asbestos inspection with id = {inspection_id}")
            except Exception as e:
                print(f"🔍 EMAIL DEBUG: Search by ID in asbestos table failed: {e}")
        
        # If not found by ID or not numeric, try by inspection_number
        if not result or not result.data:
            print(f"🔍 EMAIL DEBUG: Looking for inspection with inspection_number = {inspection_id}")
            
            # Try mold inspection table first
            try:
                result = supabase.table('inspection').select('*').eq('inspection_number', inspection_id).single().execute()
                if result and result.data:
                    inspection_type = 'mold'
                    table_name = 'inspection'
                    print(f"🔍 EMAIL DEBUG: Found mold inspection with inspection_number = {inspection_id}")
            except Exception as e:
                print(f"🔍 EMAIL DEBUG: Search by inspection_number in mold table failed: {e}")
            
            # If not found in mold table, try asbestos table
            if not result or not result.data:
                try:
                    result = supabase.table('asbestosinspection').select('*').eq('inspection_number', inspection_id).single().execute()
                    if result and result.data:
                        inspection_type = 'asbestos'
                        table_name = 'asbestosinspection'
                        print(f"🔍 EMAIL DEBUG: Found asbestos inspection with inspection_number = {inspection_id}")
                except Exception as e:
                    print(f"🔍 EMAIL DEBUG: Search by inspection_number in asbestos table failed: {e}")
        
        if not result or not result.data:
            print(f"❌ EMAIL DEBUG: Inspection with ID/Number {inspection_id} not found in either table")
            # Debug: Let's see what inspections are available
            try:
                print(f"🔍 EMAIL DEBUG: Available mold inspections (first 5):")
                mold_inspections = supabase.table('inspection').select('id, inspection_number').limit(5).execute()
                for insp in mold_inspections.data:
                    print(f"  - ID: {insp.get('id')}, inspection_number: {insp.get('inspection_number')}")
                
                print(f"🔍 EMAIL DEBUG: Available asbestos inspections (first 5):")
                asbestos_inspections = supabase.table('asbestosinspection').select('id, inspection_number').limit(5).execute()
                for insp in asbestos_inspections.data:
                    print(f"  - ID: {insp.get('id')}, inspection_number: {insp.get('inspection_number')}")
            except Exception as debug_error:
                print(f"🔍 EMAIL DEBUG: Could not fetch available inspections: {debug_error}")
            
            return None, None, None
        
        return result.data, inspection_type, table_name
    
    @app.route('/api/email/send-lab-received/<inspection_id>', methods=['POST'])
    def send_lab_received_email(inspection_id):
        """Send lab received notification email"""
        try:
            print(f"🔍 EMAIL DEBUG: Starting lab received email for inspection {inspection_id}")
            
            # Get inspection data using helper function
            inspection_data, inspection_type, table_name = get_inspection_data(inspection_id)
            
            if not inspection_data:
                return jsonify({"error": f"Inspection with ID/Number {inspection_id} not found"}), 404
            
            print(f"🔍 EMAIL DEBUG: Found {inspection_type} inspection in table {table_name}")
            
            # Prepare email data
            email_data = {
                "email": inspection_data.get('email'),
                "full_name": inspection_data.get('full_name'),
                "inspection_number": inspection_data.get('inspection_number', inspection_id),
                "inspection_type": inspection_type,
                "table_name": table_name
            }
            
            # Send email using template
            email_result = email_service.send_lab_received_email_with_template(email_data)
            
            if email_result.get('success'):
                print(f"✅ EMAIL DEBUG: Lab received email sent successfully for {inspection_type} inspection {inspection_id}")
                return jsonify(email_result)
            else:
                print(f"❌ EMAIL DEBUG: Failed to send lab received email: {email_result.get('error')}")
                return jsonify({"error": f"Failed to send lab received email: {email_result.get('error')}"}), 500
                
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error in send_lab_received_email: {e}")
            return jsonify({"error": f"Failed to send lab received email: {str(e)}"}), 500

    @app.route('/api/email/send-report-ready/<inspection_id>', methods=['POST'])
    def send_report_ready_email(inspection_id):
        """Send report ready notification email"""
        try:
            print(f"🔍 EMAIL DEBUG: Starting report ready email for inspection {inspection_id}")
            
            # Get inspection data using helper function
            inspection_data, inspection_type, table_name = get_inspection_data(inspection_id)
            
            if not inspection_data:
                return jsonify({"error": f"Inspection with ID/Number {inspection_id} not found"}), 404
            
            print(f"🔍 EMAIL DEBUG: Found {inspection_type} inspection in table {table_name}")
            
            # Prepare email data
            email_data = {
                "email": inspection_data.get('email'),
                "full_name": inspection_data.get('full_name'),
                "inspection_number": inspection_data.get('inspection_number', inspection_id),
                "inspection_type": inspection_type,
                "table_name": table_name
            }
            
            # Send email using template
            email_result = email_service.send_report_ready_email_with_template(email_data)
            
            if email_result.get('success'):
                print(f"✅ EMAIL DEBUG: Report ready email sent successfully for {inspection_type} inspection {inspection_id}")
                return jsonify(email_result)
            else:
                print(f"❌ EMAIL DEBUG: Failed to send report ready email: {email_result.get('error')}")
                return jsonify({"error": f"Failed to send report ready email: {email_result.get('error')}"}), 500
                
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error in send_report_ready_email: {e}")
            return jsonify({"error": f"Failed to send report ready email: {str(e)}"}), 500

    @app.route('/api/email/send-review-request/<inspection_id>', methods=['POST'])
    def send_review_request_email(inspection_id):
        """Send review request email"""
        try:
            print(f"🔍 EMAIL DEBUG: Starting review request email for inspection {inspection_id}")
            
            # Get inspection data using helper function
            inspection_data, inspection_type, table_name = get_inspection_data(inspection_id)
            
            if not inspection_data:
                return jsonify({"error": f"Inspection with ID/Number {inspection_id} not found"}), 404
            
            print(f"🔍 EMAIL DEBUG: Found {inspection_type} inspection in table {table_name}")
            
            # Prepare email data
            email_data = {
                "email": inspection_data.get('email'),
                "full_name": inspection_data.get('full_name'),
                "inspection_number": inspection_data.get('inspection_number', inspection_id),
                "inspection_type": inspection_type,
                "table_name": table_name
            }
            
            # Send email using template
            email_result = email_service.send_review_request_email_with_template(email_data)
            
            if email_result.get('success'):
                print(f"✅ EMAIL DEBUG: Review request email sent successfully for {inspection_type} inspection {inspection_id}")
                return jsonify(email_result)
            else:
                print(f"❌ EMAIL DEBUG: Failed to send review request email: {email_result.get('error')}")
                return jsonify({"error": f"Failed to send review request email: {email_result.get('error')}"}), 500
                
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error in send_review_request_email: {e}")
            return jsonify({"error": f"Failed to send review request email: {str(e)}"}), 500

    @app.route('/api/email/send-inspection-created/<int:inspection_id>', methods=['POST'])
    def send_inspection_created_email(inspection_id):
        """Send inspection created welcome email"""
        try:
            print(f"🔍 EMAIL DEBUG: Starting inspection created email for inspection {inspection_id}")
            
            # Get inspection data using helper function
            inspection_data, inspection_type, table_name = get_inspection_data(inspection_id)
            
            if not inspection_data:
                return jsonify({"error": f"Inspection with ID {inspection_id} not found"}), 404
            
            print(f"🔍 EMAIL DEBUG: Found {inspection_type} inspection in table {table_name}")
            
            # Prepare email data
            email_data = {
                "email": inspection_data.get('email'),
                "full_name": inspection_data.get('full_name'),
                "inspection_number": inspection_data.get('inspection_number', f"INS-{str(inspection_id).zfill(4)}"),
                "street_address": inspection_data.get('street_address', ''),
                "unit_number": inspection_data.get('unit_number', ''),
                "city": inspection_data.get('city', ''),
                "state": inspection_data.get('state', ''),
                "zip_code": inspection_data.get('zip_code', ''),
                "inspection_type": inspection_type,
                "table_name": table_name
            }
            
            print(f"🔍 EMAIL DEBUG: Extracted inspection data: {email_data}")
            
            # Send email using template
            email_result = email_service.send_inspection_created_email_with_template(email_data)
            
            if email_result.get('success'):
                print(f"✅ EMAIL DEBUG: Inspection created email sent successfully for {inspection_type} inspection {inspection_id}")
                return jsonify(email_result)
            else:
                print(f"❌ EMAIL DEBUG: Failed to send inspection created email: {email_result.get('error')}")
                return jsonify({"error": f"Failed to send inspection created email: {email_result.get('error')}"}), 500
                
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error in send_inspection_created_email: {e}")
            return jsonify({"error": f"Failed to send inspection created email: {str(e)}"}), 500

    @app.route('/api/email/templates', methods=['GET'])
    def get_email_templates():
        """Get all email templates"""
        try:
            templates = email_service.get_templates()
            return jsonify(templates)
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error getting templates: {e}")
            return jsonify({"error": f"Failed to get email templates: {str(e)}"}), 500

    @app.route('/api/email/templates', methods=['PUT'])
    def save_email_templates():
        """Save email templates"""
        try:
            templates_data = request.get_json()
            if not templates_data:
                return jsonify({"error": "No template data provided"}), 400
            
            result = email_service.save_templates(templates_data)
            if result.get('success'):
                return jsonify(result)
            else:
                return jsonify({"error": f"Failed to save templates: {result.get('error')}"}), 500
                
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error saving templates: {e}")
            return jsonify({"error": f"Failed to save email templates: {str(e)}"}), 500

    @app.route('/api/email/templates/reset', methods=['POST'])
    def reset_email_templates():
        """Reset email templates to defaults"""
        try:
            result = email_service.reset_templates()
            if result.get('success'):
                return jsonify(result.get('templates', {}))
            else:
                return jsonify({"error": f"Failed to reset templates: {result.get('error')}"}), 500
                
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error resetting templates: {e}")
            return jsonify({"error": f"Failed to reset email templates: {str(e)}"}), 500