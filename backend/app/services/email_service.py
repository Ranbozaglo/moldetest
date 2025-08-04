import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
import os
import json
from datetime import datetime

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.username = os.getenv("SMTP_USERNAME", "")
        self.password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.username)
        
        # Template storage file path
        self.templates_file = os.path.join(os.path.dirname(__file__), '..', '..', 'email_templates.json')
        
        # Default templates
        self.default_templates = {
            "lab_received": {
                "subject": "Total Testing - Lab Samples Received (Inspection #{inspection_number})",
                "body": """<html>
<body>
    <p>Hi {full_name},</p>
    
    <p>Just a quick update, your mold test samples have been received by our lab and are now being processed.</p>
    
    <p>Our team is reviewing the findings and preparing your personalized report. You can expect to receive your full results and expert interpretation within 48–72 business hours.</p>
    
    <p>You can track the status of your report here: <a href="{dashboard_url}" style="color: #004aac; text-decoration: none; font-weight: bold;">Track My Report</a></p>
    
    <p>We'll notify you the moment your report is ready.</p>
    
    <p>Thank you for trusting Total Testing with your health and home!</p>
    
    <br>
    <p>Warm regards,<br>Total Testing</p>
</body>
</html>"""
            },
            "report_ready": {
                "subject": "Total Testing - Report Ready (Inspection #{inspection_number})",
                "body": """<html>
<body>
    <p>Hi {full_name},</p>
    
    <p>Your lab results and mold inspection report are now ready to view in your secure portal.</p>
    
    <p><strong>This report includes:</strong></p>
    <ul style="margin-left: 20px; line-height: 1.6;">
        <li>Inspection finding</li>
        <li>Lab-verified analysis of your samples</li>
        <li>Mold types identified and spore levels</li>
        <li>Professional interpretation and next steps (if needed)</li>
    </ul>
    
    <p>🔗 View your report now by visiting your portal:</p>
    <p>👉 <a href="{dashboard_url}" style="color: #004aac; text-decoration: none; font-weight: bold; background-color: #f0f8ff; padding: 8px 16px; border-radius: 5px; display: inline-block;">Access Your Report</a></p>
    
    <br>
    <p>Thanks again for choosing Total Testing!</p>
</body>
</html>"""
            },
            "review_request": {
                "subject": "Total Testing - Review Request (Inspection #{inspection_number})",
                "body": """<html>
<body>
    <h2>Total Testing - Review Request</h2>
    <p>Dear {full_name},</p>
    <p>Thank you for using our mold testing services. We hope you found our service helpful.</p>
    <p>If you could take a moment to leave us a review, it would mean a lot to us and help other customers make informed decisions.</p>
    <p>Thank you for choosing Total Testing.</p>
    <br>
    <p>Best regards,<br>Total Testing Team</p>
</body>
</html>"""
            },
            "inspection_created": {
                "subject": "Welcome to Total Testing - Inspection #{inspection_number} Created",
                "body": """<html>
<body>
    <h2>Welcome to Total Testing!</h2>
    <p>Dear {full_name},</p>
    <p>Congratulations! Your mold inspection has been successfully created.</p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h3 style="color: #004aac; margin-top: 0;">Your Inspection Details:</h3>
        <p><strong>Inspection Number:</strong> {inspection_number}</p>
        <p><strong>Property Address:</strong> {street_address}{unit_number}, {city}, {state} {zip_code}</p>
        <p><strong>Status:</strong> Ready for Sample Collection</p>
    </div>
    
    <h3>📋 Next Steps:</h3>
    <ol>
        <li><strong>Collect Your Samples:</strong> Follow the sampling guide provided during your inspection setup</li>
        <li><strong>Send Samples to Lab:</strong> Use the prepaid shipping materials to send your samples</li>
        <li><strong>Track Progress:</strong> Monitor your inspection status in your dashboard</li>
        <li><strong>Receive Results:</strong> Get your detailed report within 3-5 business days</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{dashboard_url}" style="background-color: #004aac; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View My Inspections
        </a>
    </div>
    
    <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
    <p>Thank you for choosing Total Testing for your mold inspection needs!</p>
    
    <br>
    <p>Best regards,<br>The Total Testing Team</p>
    
    <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
    <p style="font-size: 12px; color: #6c757d;">
        This email was sent to {email} regarding inspection #{inspection_number}. 
        You received this because you created a new mold inspection with Total Testing.
    </p>
</body>
</html>"""
            }
        }
        
        # Debug logging
        print(f"🔧 EMAIL DEBUG: SMTP Server: {self.smtp_server}")
        print(f"🔧 EMAIL DEBUG: SMTP Port: {self.smtp_port}")
        print(f"🔧 EMAIL DEBUG: Username: {self.username}")
        print(f"🔧 EMAIL DEBUG: Password set: {'Yes' if self.password else 'No'}")
        print(f"🔧 EMAIL DEBUG: From Email: {self.from_email}")
        print(f"🔧 EMAIL DEBUG: Templates file: {self.templates_file}")
    
    def send_email(self, to_email: str, subject: str, body: str) -> Dict[str, Any]:
        """
        Send email using SMTP
        """
        try:
            print(f"🔧 EMAIL DEBUG: Attempting to send email to {to_email}")
            print(f"🔧 EMAIL DEBUG: Subject: {subject}")
            
            # Validate email settings
            if not self.username or not self.password:
                error_msg = "SMTP credentials not configured. Please set SMTP_USERNAME and SMTP_PASSWORD environment variables."
                print(f"❌ EMAIL DEBUG: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "message": "SMTP credentials not configured"
                }
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add body
            msg.attach(MIMEText(body, 'html'))
            
            print(f"🔧 EMAIL DEBUG: Connecting to {self.smtp_server}:{self.smtp_port}")
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                print(f"🔧 EMAIL DEBUG: Starting TLS")
                server.starttls()
                
                print(f"🔧 EMAIL DEBUG: Attempting login with username: {self.username}")
                server.login(self.username, self.password)
                print(f"🔧 EMAIL DEBUG: Login successful")
                
                print(f"🔧 EMAIL DEBUG: Sending message")
                server.send_message(msg)
                print(f"🔧 EMAIL DEBUG: Message sent successfully")
            
            return {
                "success": True,
                "message": "Email sent successfully",
                "to": to_email,
                "subject": subject
            }
            
        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP Authentication failed: {str(e)}"
            print(f"❌ EMAIL DEBUG: {error_msg}")
            print(f"🔧 EMAIL DEBUG: Common solutions:")
            print(f"   1. Enable 2-Factor Authentication on your Gmail account")
            print(f"   2. Generate an App Password (not your regular password)")
            print(f"   3. Use the App Password as SMTP_PASSWORD")
            print(f"   4. Make sure SMTP_USERNAME is your full Gmail address")
            return {
                "success": False,
                "error": error_msg,
                "message": "SMTP authentication failed. Check your Gmail settings."
            }
            
        except smtplib.SMTPException as e:
            error_msg = f"SMTP Error: {str(e)}"
            print(f"❌ EMAIL DEBUG: {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "message": "SMTP error occurred"
            }
            
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            print(f"❌ EMAIL DEBUG: {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "message": "Failed to send email"
            }
    
    def send_lab_received_email(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send lab received notification email
        """
        subject = f"Total Testing - Lab Samples Received (Inspection #{inspection_data.get('inspection_number', 'N/A')})"
        
        body = f"""
        <html>
        <body>
            <h2>Total Testing - Lab Samples Received</h2>
            <p>Dear {inspection_data.get('full_name', 'Valued Customer')},</p>
            <p>We have received your mold testing samples for inspection #{inspection_data.get('inspection_number', 'N/A')}.</p>
            <p>Our laboratory is now processing your samples and will provide results within 3-5 business days.</p>
            <p>We will notify you as soon as your report is ready.</p>
            <p>Thank you for choosing Total Testing.</p>
            <br>
            <p>Best regards,<br>Total Testing Team</p>
        </body>
        </html>
        """ 
        
        return self.send_email(
            inspection_data.get('email'),
            subject,
            body
        )
    
    def send_report_ready_email(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send report ready notification email
        """
        subject = f"Total Testing - Report Ready (Inspection #{inspection_data.get('inspection_number', 'N/A')})"
        
        body = f"""
        <html>
        <body>
            <h2>Total Testing - Report Ready</h2>
            <p>Dear {inspection_data.get('full_name', 'Valued Customer')},</p>
            <p>Your Total Testing report for inspection #{inspection_data.get('inspection_number', 'N/A')} is now ready.</p>
            <p>You can download your report from your account dashboard.</p>
            <p>If you have any questions about your results, please don't hesitate to contact us.</p>
            <p>Thank you for choosing Total Testing.</p>
            <br>
            <p>Best regards,<br>Total Testing Team</p>
        </body>
        </html>
        """
        
        return self.send_email(
            inspection_data.get('email'),
            subject,
            body
        )
    
    def send_review_request_email(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send review request email
        """
        subject = f"Total Testing - Review Request (Inspection #{inspection_data.get('inspection_number', 'N/A')})"
        
        body = f"""
        <html>
        <body>
            <h2>Total Testing - Review Request</h2>
            <p>Dear {inspection_data.get('full_name', 'Valued Customer')},</p>
            <p>Thank you for using our mold testing services. We hope you found our service helpful.</p>
            <p>If you could take a moment to leave us a review, it would mean a lot to us and help other customers make informed decisions.</p>
            <p>Thank you for choosing Total Testing.</p>
            <br>
            <p>Best regards,<br>Total Testing Team</p>
        </body>
        </html>
        """
        
        return self.send_email(
            inspection_data.get('email'),
            subject,
            body
        )
    
    def get_templates(self) -> Dict[str, Any]:
        """
        Get email templates from storage or return defaults
        """
        try:
            if os.path.exists(self.templates_file):
                with open(self.templates_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # Return default templates if no file exists
                return self.default_templates
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error loading templates: {e}")
            return self.default_templates
    
    def save_templates(self, templates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save email templates to storage
        """
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.templates_file), exist_ok=True)
            
            # Save templates to file
            with open(self.templates_file, 'w', encoding='utf-8') as f:
                json.dump(templates, f, indent=2, ensure_ascii=False)
            
            print(f"✅ EMAIL DEBUG: Templates saved successfully to {self.templates_file}")
            return {
                "success": True,
                "message": "Email templates saved successfully",
                "templates": templates
            }
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error saving templates: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to save email templates"
            }
    
    def reset_templates(self) -> Dict[str, Any]:
        """
        Reset email templates to defaults
        """
        try:
            # Save default templates
            result = self.save_templates(self.default_templates)
            if result.get('success'):
                print(f"✅ EMAIL DEBUG: Templates reset to defaults")
                return {
                    "success": True,
                    "message": "Email templates reset to defaults",
                    "templates": self.default_templates
                }
            else:
                return result
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error resetting templates: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to reset email templates"
            }
    
    def format_template(self, template: str, data: Dict[str, Any]) -> str:
        """
        Format template string with data variables
        """
        try:
            # Replace template variables with actual data
            formatted = template
            for key, value in data.items():
                placeholder = f"{{{key}}}"
                if placeholder in formatted:
                    formatted = formatted.replace(placeholder, str(value or ''))
            return formatted
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error formatting template: {e}")
            return template
    
    def send_lab_received_email_with_template(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send lab received notification email using stored template
        """
        try:
            templates = self.get_templates()
            template = templates.get('lab_received', self.default_templates['lab_received'])
            
            # Add dashboard URL to inspection data
            inspection_data_with_url = inspection_data.copy()
            dashboard_url = os.getenv('FRONTEND_URL', 'https://mold-testing.netlify.app') + '/MyInspections'
            inspection_data_with_url['dashboard_url'] = dashboard_url
            
            subject = self.format_template(template['subject'], inspection_data_with_url)
            body = self.format_template(template['body'], inspection_data_with_url)
            
            return self.send_email(inspection_data.get('email'), subject, body)
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error sending templated lab received email: {e}")
            # Fallback to original method
            return self.send_lab_received_email(inspection_data)
    
    def send_report_ready_email_with_template(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send report ready notification email using stored template
        """
        try:
            templates = self.get_templates()
            template = templates.get('report_ready', self.default_templates['report_ready'])
            
            # Add dashboard URL to inspection data
            inspection_data_with_url = inspection_data.copy()
            dashboard_url = os.getenv('FRONTEND_URL', 'https://mold-testing.netlify.app') + '/MyInspections'
            inspection_data_with_url['dashboard_url'] = dashboard_url
            
            subject = self.format_template(template['subject'], inspection_data_with_url)
            body = self.format_template(template['body'], inspection_data_with_url)
            
            return self.send_email(inspection_data.get('email'), subject, body)
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error sending templated report ready email: {e}")
            # Fallback to original method
            return self.send_report_ready_email(inspection_data)
    
    def send_review_request_email_with_template(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send review request email using stored template
        """
        try:
            templates = self.get_templates()
            template = templates.get('review_request', self.default_templates['review_request'])
            
            # Add dashboard URL to inspection data (for future template use)
            inspection_data_with_url = inspection_data.copy()
            dashboard_url = os.getenv('FRONTEND_URL', 'https://mold-testing.netlify.app') + '/MyInspections'
            inspection_data_with_url['dashboard_url'] = dashboard_url
            
            subject = self.format_template(template['subject'], inspection_data_with_url)
            body = self.format_template(template['body'], inspection_data_with_url)
            
            return self.send_email(inspection_data.get('email'), subject, body)
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error sending templated review request email: {e}")
            # Fallback to original method
            return self.send_review_request_email(inspection_data)
    
    def send_inspection_created_email_with_template(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send inspection created welcome email using stored template
        """
        try:
            print(f"🔍 EMAIL DEBUG: Sending inspection created email with template")
            print(f"🔍 EMAIL DEBUG: Inspection data: {inspection_data}")
            
            templates = self.get_templates()
            template = templates.get('inspection_created', self.default_templates['inspection_created'])
            
            # Add dashboard URL to inspection data
            inspection_data_with_url = inspection_data.copy()
            dashboard_url = os.getenv('FRONTEND_URL', 'https://mold-testing.netlify.app') + '/MyInspections'
            inspection_data_with_url['dashboard_url'] = dashboard_url
            
            # Handle missing address fields gracefully
            inspection_data_with_url['unit_number'] = inspection_data.get('unit_number', '')
            if inspection_data_with_url['unit_number']:
                inspection_data_with_url['unit_number'] = f", {inspection_data_with_url['unit_number']}"
            
            # Ensure all required fields have defaults
            inspection_data_with_url.setdefault('street_address', 'Not provided')
            inspection_data_with_url.setdefault('city', 'Not provided')
            inspection_data_with_url.setdefault('state', 'Not provided')
            inspection_data_with_url.setdefault('zip_code', 'Not provided')
            
            subject = self.format_template(template['subject'], inspection_data_with_url)
            body = self.format_template(template['body'], inspection_data_with_url)
            
            print(f"🔍 EMAIL DEBUG: Formatted subject: {subject}")
            print(f"🔍 EMAIL DEBUG: Sending to email: {inspection_data.get('email')}")
            
            return self.send_email(inspection_data.get('email'), subject, body)
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error sending templated inspection created email: {e}")
            return {
                "success": False,
                "error": f"Failed to send inspection created email: {str(e)}",
                "message": "Error in send_inspection_created_email_with_template"
            }

# Create service instance
email_service = EmailService()