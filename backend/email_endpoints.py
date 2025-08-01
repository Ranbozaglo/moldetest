from flask import jsonify
from app.services.email_service import email_service

def register_email_endpoints(app, supabase):
    """Register email endpoints with the Flask app"""
    
    @app.route('/api/email/send-lab-received/<int:inspection_id>', methods=['POST'])
    def send_lab_received_email(inspection_id):
        """Send lab received notification email"""
        try:
            print(f"🔍 EMAIL DEBUG: Starting lab received email for inspection {inspection_id}")
            
            # Fetch inspection data from database using inspection_number
            print(f"🔍 EMAIL DEBUG: Looking for inspection with inspection_number = {inspection_id}")
            result = supabase.table('inspection').select('*').eq('inspection_number', inspection_id).single().execute()
            
            if not result.data:
                print(f"❌ EMAIL DEBUG: Inspection with number {inspection_id} not found in database")
                # Debug: Let's see what inspections are available
                try:
                    all_inspections = supabase.table('inspection').select('id, inspection_number').limit(10).execute()
                    print(f"🔍 EMAIL DEBUG: Available inspections (first 10):")
                    for insp in all_inspections.data:
                        print(f"  - ID: {insp.get('id')}, inspection_number: {insp.get('inspection_number')}")
                except Exception as debug_error:
                    print(f"🔍 EMAIL DEBUG: Could not fetch available inspections: {debug_error}")
                
                return jsonify({"error": f"Inspection with number {inspection_id} not found"}), 404
            
            inspection_data = {
                "email": result.data.get('email'),
                "full_name": result.data.get('full_name'),
                "inspection_number": result.data.get('inspection_number', inspection_id)
            }
            
            # Send email
            email_result = email_service.send_lab_received_email(inspection_data)
            
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
            
            # Fetch inspection data from database using inspection_number
            print(f"🔍 EMAIL DEBUG: Looking for inspection with inspection_number = {inspection_id}")
            result = supabase.table('inspection').select('*').eq('inspection_number', inspection_id).single().execute()
            
            if not result.data:
                print(f"❌ EMAIL DEBUG: Inspection with number {inspection_id} not found in database")
                # Debug: Let's see what inspections are available
                try:
                    all_inspections = supabase.table('inspection').select('id, inspection_number').limit(10).execute()
                    print(f"🔍 EMAIL DEBUG: Available inspections (first 10):")
                    for insp in all_inspections.data:
                        print(f"  - ID: {insp.get('id')}, inspection_number: {insp.get('inspection_number')}")
                except Exception as debug_error:
                    print(f"🔍 EMAIL DEBUG: Could not fetch available inspections: {debug_error}")
                
                return jsonify({"error": f"Inspection with number {inspection_id} not found"}), 404
            
            inspection_data = {
                "email": result.data.get('email'),
                "full_name": result.data.get('full_name'),
                "inspection_number": result.data.get('inspection_number', inspection_id)
            }
            
            # Send email
            email_result = email_service.send_report_ready_email(inspection_data)
            
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
            
            # Fetch inspection data from database using inspection_number
            result = supabase.table('inspection').select('*').eq('inspection_number', inspection_id).single().execute()
            
            if not result.data:
                print(f"❌ EMAIL DEBUG: Inspection {inspection_id} not found in database")
                return jsonify({"error": f"Inspection {inspection_id} not found"}), 404
            
            inspection_data = {
                "email": result.data.get('email'),
                "full_name": result.data.get('full_name'),
                "inspection_number": result.data.get('inspection_number', inspection_id)
            }
            
            # Send email
            email_result = email_service.send_review_request_email(inspection_data)
            
            if email_result.get('success'):
                print(f"✅ EMAIL DEBUG: Review request email sent successfully for inspection {inspection_id}")
                return jsonify(email_result)
            else:
                print(f"❌ EMAIL DEBUG: Failed to send review request email: {email_result.get('error')}")
                return jsonify({"error": f"Failed to send review request email: {email_result.get('error')}"}), 500
                
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error in send_review_request_email: {e}")
            return jsonify({"error": f"Failed to send review request email: {str(e)}"}), 500