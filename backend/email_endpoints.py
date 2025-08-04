from flask import jsonify, request
from app.services.email_service import email_service

def register_email_endpoints(app, supabase):
    """Register email endpoints with the Flask app"""
    
    @app.route('/api/email/send-lab-received/<int:inspection_id>', methods=['POST'])
    def send_lab_received_email(inspection_id):
        """Send lab received notification email"""
        try:
            print(f"🔍 EMAIL DEBUG: Starting lab received email for inspection {inspection_id}")
            
            # Fetch inspection data from database using inspection ID
            print(f"🔍 EMAIL DEBUG: Looking for inspection with id = {inspection_id}")
            result = supabase.table('inspection').select('*').eq('id', inspection_id).single().execute()
            
            if not result.data:
                print(f"❌ EMAIL DEBUG: Inspection with ID {inspection_id} not found in database")
                # Debug: Let's see what inspections are available
                try:
                    all_inspections = supabase.table('inspection').select('id, inspection_number').limit(10).execute()
                    print(f"🔍 EMAIL DEBUG: Available inspections (first 10):")
                    for insp in all_inspections.data:
                        print(f"  - ID: {insp.get('id')}, inspection_number: {insp.get('inspection_number')}")
                except Exception as debug_error:
                    print(f"🔍 EMAIL DEBUG: Could not fetch available inspections: {debug_error}")
                
                return jsonify({"error": f"Inspection with ID {inspection_id} not found"}), 404
            
            inspection_data = {
                "email": result.data.get('email'),
                "full_name": result.data.get('full_name'),
                "inspection_number": result.data.get('inspection_number', inspection_id)
            }
            
            # Send email using template
            email_result = email_service.send_lab_received_email_with_template(inspection_data)
            
            if email_result.get('success'):
                print(f"✅ EMAIL DEBUG: Lab received email sent successfully for inspection {inspection_id}")
                return jsonify(email_result)
            else:
                print(f"❌ EMAIL DEBUG: Failed to send lab received email: {email_result.get('error')}")
                return jsonify({"error": f"Failed to send lab received email: {email_result.get('error')}"}), 500
                
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error in send_lab_received_email: {e}")
            return jsonify({"error": f"Failed to send lab received email: {str(e)}"}), 500

    @app.route('/api/email/send-report-ready/<int:inspection_id>', methods=['POST'])
    def send_report_ready_email(inspection_id):
        """Send report ready notification email"""
        try:
            print(f"🔍 EMAIL DEBUG: Starting report ready email for inspection {inspection_id}")
            
            # Fetch inspection data from database using inspection ID
            print(f"🔍 EMAIL DEBUG: Looking for inspection with id = {inspection_id}")
            result = supabase.table('inspection').select('*').eq('id', inspection_id).single().execute()
            
            if not result.data:
                print(f"❌ EMAIL DEBUG: Inspection with ID {inspection_id} not found in database")
                # Debug: Let's see what inspections are available
                try:
                    all_inspections = supabase.table('inspection').select('id, inspection_number').limit(10).execute()
                    print(f"🔍 EMAIL DEBUG: Available inspections (first 10):")
                    for insp in all_inspections.data:
                        print(f"  - ID: {insp.get('id')}, inspection_number: {insp.get('inspection_number')}")
                except Exception as debug_error:
                    print(f"🔍 EMAIL DEBUG: Could not fetch available inspections: {debug_error}")
                
                return jsonify({"error": f"Inspection with ID {inspection_id} not found"}), 404
            
            inspection_data = {
                "email": result.data.get('email'),
                "full_name": result.data.get('full_name'),
                "inspection_number": result.data.get('inspection_number', inspection_id)
            }
            
            # Send email using template
            email_result = email_service.send_report_ready_email_with_template(inspection_data)
            
            if email_result.get('success'):
                print(f"✅ EMAIL DEBUG: Report ready email sent successfully for inspection {inspection_id}")
                return jsonify(email_result)
            else:
                print(f"❌ EMAIL DEBUG: Failed to send report ready email: {email_result.get('error')}")
                return jsonify({"error": f"Failed to send report ready email: {email_result.get('error')}"}), 500
                
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error in send_report_ready_email: {e}")
            return jsonify({"error": f"Failed to send report ready email: {str(e)}"}), 500

    @app.route('/api/email/send-review-request/<int:inspection_id>', methods=['POST'])
    def send_review_request_email(inspection_id):
        """Send review request email"""
        try:
            print(f"🔍 EMAIL DEBUG: Starting review request email for inspection {inspection_id}")
            
            # Fetch inspection data from database using inspection ID
            result = supabase.table('inspection').select('*').eq('id', inspection_id).single().execute()
            
            if not result.data:
                print(f"❌ EMAIL DEBUG: Inspection with ID {inspection_id} not found in database")
                return jsonify({"error": f"Inspection with ID {inspection_id} not found"}), 404
            
            inspection_data = {
                "email": result.data.get('email'),
                "full_name": result.data.get('full_name'),
                "inspection_number": result.data.get('inspection_number', inspection_id)
            }
            
            # Send email using template
            email_result = email_service.send_review_request_email_with_template(inspection_data)
            
            if email_result.get('success'):
                print(f"✅ EMAIL DEBUG: Review request email sent successfully for inspection {inspection_id}")
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
            
            # Fetch inspection data from database using inspection ID (not inspection_number like others)
            print(f"🔍 EMAIL DEBUG: Looking for inspection with id = {inspection_id}")
            result = supabase.table('inspection').select('*').eq('id', inspection_id).single().execute()
            
            if not result.data:
                print(f"❌ EMAIL DEBUG: Inspection with ID {inspection_id} not found in database")
                # Debug: Let's see what inspections are available
                try:
                    all_inspections = supabase.table('inspection').select('id, inspection_number').limit(10).execute()
                    print(f"🔍 EMAIL DEBUG: Available inspections (first 10):")
                    for insp in all_inspections.data:
                        print(f"  - ID: {insp.get('id')}, inspection_number: {insp.get('inspection_number')}")
                except Exception as debug_error:
                    print(f"🔍 EMAIL DEBUG: Could not fetch available inspections: {debug_error}")
                
                return jsonify({"error": f"Inspection with ID {inspection_id} not found"}), 404
            
            inspection_data = {
                "email": result.data.get('email'),
                "full_name": result.data.get('full_name'),
                "inspection_number": result.data.get('inspection_number', f"INS-{str(inspection_id).zfill(4)}"),
                "street_address": result.data.get('street_address', ''),
                "unit_number": result.data.get('unit_number', ''),
                "city": result.data.get('city', ''),
                "state": result.data.get('state', ''),
                "zip_code": result.data.get('zip_code', ''),
            }
            
            print(f"🔍 EMAIL DEBUG: Extracted inspection data: {inspection_data}")
            
            # Send email using template
            email_result = email_service.send_inspection_created_email_with_template(inspection_data)
            
            if email_result.get('success'):
                print(f"✅ EMAIL DEBUG: Inspection created email sent successfully for inspection {inspection_id}")
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