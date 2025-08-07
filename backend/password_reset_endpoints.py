"""
Password Reset Endpoints for Flask Backend
Handles password reset request and confirmation flow
"""

from flask import jsonify, request
from datetime import datetime, timedelta
import uuid
import secrets
from werkzeug.security import generate_password_hash
from app.services.email_service import email_service
import logging

logger = logging.getLogger(__name__)

def register_password_reset_endpoints(app, supabase):
    """Register password reset endpoints with the Flask app"""
    
    @app.route('/api/request-password-reset', methods=['POST'])
    def request_password_reset():
        """
        Request password reset endpoint
        Accepts email, finds user, generates token, and sends reset email
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body is required"}), 400
            
            email = data.get('email', '').strip().lower()
            
            # Validate email
            if not email:
                return jsonify({"error": "Email address is required"}), 400
            
            # Basic email format validation
            if '@' not in email or '.' not in email:
                return jsonify({"error": "Invalid email format"}), 400
            
            logger.info(f"Password reset requested for email: {email}")
            
            # Find user in user_profiles table
            try:
                user_result = supabase.table('user_profiles').select('id, email, full_name').eq('email', email).execute()
                
                if not user_result.data:
                    logger.warning(f"Password reset requested for non-existent email: {email}")
                    # For security, return success even if user doesn't exist
                    return jsonify({
                        "success": True,
                        "message": "If an account with that email exists, you will receive a password reset link."
                    }), 200
                
                user_data = user_result.data[0]
                user_id = str(user_data['id'])  # Ensure user_id is string (UUID)
                full_name = user_data.get('full_name', '')
                
                logger.info(f"User found for password reset: {email} (ID: {user_id})")
                
            except Exception as e:
                logger.error(f"Error finding user for password reset: {e}")
                return jsonify({"error": "An error occurred. Please try again."}), 500
            
            # Generate secure token
            reset_token = str(uuid.uuid4())
            
            # Insert token into password_reset_tokens table
            try:
                token_result = supabase.table('password_reset_tokens').insert({
                    'user_id': user_id,
                    'token': reset_token,
                    'used': False,
                    'created_at': datetime.utcnow().isoformat()
                }).execute()
                
                if not token_result.data:
                    logger.error("Failed to create password reset token")
                    return jsonify({"error": "An error occurred. Please try again."}), 500
                
                logger.info(f"Password reset token created for user {user_id}")
                
            except Exception as e:
                logger.error(f"Error creating password reset token: {e}")
                return jsonify({"error": "An error occurred. Please try again."}), 500
            
            # Send password reset email
            try:
                # Get base URL from request headers or environment
                base_url = request.headers.get('Origin') or 'https://total-testing-diy.com'
                reset_link = f"{base_url}/reset-password?token={reset_token}"
                
                email_data = {
                    'email': email,
                    'full_name': full_name,
                    'reset_link': reset_link,
                    'token': reset_token
                }
                
                # Send email using existing email service
                success = email_service.send_password_reset_email(email_data)
                
                if not success:
                    logger.error(f"Failed to send password reset email to {email}")
                    # Mark token as used since email failed
                    supabase.table('password_reset_tokens').update({
                        'used': True
                    }).eq('token', reset_token).execute()
                    
                    return jsonify({"error": "Failed to send reset email. Please try again."}), 500
                
                logger.info(f"Password reset email sent successfully to {email}")
                
            except Exception as e:
                logger.error(f"Error sending password reset email: {e}")
                # Mark token as used since email failed
                try:
                    supabase.table('password_reset_tokens').update({
                        'used': True
                    }).eq('token', reset_token).execute()
                except:
                    pass
                
                return jsonify({"error": "Failed to send reset email. Please try again."}), 500
            
            return jsonify({
                "success": True,
                "message": "If an account with that email exists, you will receive a password reset link."
            }), 200
            
        except Exception as e:
            logger.error(f"Unexpected error in request_password_reset: {e}")
            return jsonify({"error": "An unexpected error occurred. Please try again."}), 500
    
    @app.route('/api/confirm-password-reset', methods=['POST'])
    def confirm_password_reset():
        """
        Confirm password reset endpoint
        Validates token and updates user password
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body is required"}), 400
            
            token = data.get('token', '').strip()
            new_password = data.get('password', '').strip()
            
            # Validate inputs
            if not token:
                return jsonify({"error": "Reset token is required"}), 400
            
            if not new_password:
                return jsonify({"error": "New password is required"}), 400
            
            # Password strength validation
            if len(new_password) < 8:
                return jsonify({"error": "Password must be at least 8 characters long"}), 400
            
            logger.info(f"Password reset confirmation attempt with token: {token[:8]}...")
            
            # Validate token
            try:
                # Get token from database with user info
                token_result = supabase.table('password_reset_tokens').select(
                    'id, user_id, token, used, created_at'
                ).eq('token', token).execute()
                
                if not token_result.data:
                    logger.warning(f"Invalid password reset token used: {token[:8]}...")
                    return jsonify({"error": "Invalid or expired reset token"}), 400
                
                token_data = token_result.data[0]
                
                # Check if token is already used
                if token_data['used']:
                    logger.warning(f"Already used password reset token: {token[:8]}...")
                    return jsonify({"error": "Reset token has already been used"}), 400
                
                # Check if token is expired (24 hours)
                created_at = datetime.fromisoformat(token_data['created_at'].replace('Z', '+00:00'))
                expiry_time = created_at + timedelta(hours=24)
                
                if datetime.utcnow().replace(tzinfo=created_at.tzinfo) > expiry_time:
                    logger.warning(f"Expired password reset token used: {token[:8]}...")
                    # Mark token as used
                    supabase.table('password_reset_tokens').update({
                        'used': True
                    }).eq('token', token).execute()
                    
                    return jsonify({"error": "Reset token has expired"}), 400
                
                user_id = token_data['user_id']
                logger.info(f"Valid password reset token for user ID: {user_id}")
                
            except Exception as e:
                logger.error(f"Error validating password reset token: {e}")
                return jsonify({"error": "Invalid or expired reset token"}), 400
            
            # Update user password
            try:
                # Hash the new password using bcrypt (via werkzeug)
                password_hash = generate_password_hash(new_password)
                
                # Update user's password in user_profiles table
                user_update_result = supabase.table('user_profiles').update({
                    'password_hash': password_hash,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('id', user_id).execute()
                
                if not user_update_result.data:
                    logger.error(f"Failed to update password for user ID: {user_id}")
                    return jsonify({"error": "Failed to update password. Please try again."}), 500
                
                logger.info(f"Password updated successfully for user ID: {user_id}")
                
            except Exception as e:
                logger.error(f"Error updating user password: {e}")
                return jsonify({"error": "Failed to update password. Please try again."}), 500
            
            # Mark token as used
            try:
                supabase.table('password_reset_tokens').update({
                    'used': True
                }).eq('token', token).execute()
                
                logger.info(f"Password reset token marked as used: {token[:8]}...")
                
            except Exception as e:
                logger.error(f"Error marking token as used: {e}")
                # Password was updated successfully, so this is not a critical error
                pass
            
            return jsonify({
                "success": True,
                "message": "Password has been reset successfully. You can now sign in with your new password."
            }), 200
            
        except Exception as e:
            logger.error(f"Unexpected error in confirm_password_reset: {e}")
            return jsonify({"error": "An unexpected error occurred. Please try again."}), 500