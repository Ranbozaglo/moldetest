import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
import os
from datetime import datetime

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.username = os.getenv("SMTP_USERNAME", "")
        self.password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.username)
        
        # Debug logging
        print(f"🔧 EMAIL DEBUG: SMTP Server: {self.smtp_server}")
        print(f"🔧 EMAIL DEBUG: SMTP Port: {self.smtp_port}")
        print(f"🔧 EMAIL DEBUG: Username: {self.username}")
        print(f"🔧 EMAIL DEBUG: Password set: {'Yes' if self.password else 'No'}")
        print(f"🔧 EMAIL DEBUG: From Email: {self.from_email}")
    
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
        subject = f"Mold Testing Houston - Samples Received (Inspection #{inspection_data.get('inspection_number', 'N/A')})"
        
        body = f"""
        <html>
        <body>
            <h2>Mold Testing Houston - Samples Received</h2>
            <p>Dear {inspection_data.get('full_name', 'Valued Customer')},</p>
            <p>We have received your mold testing samples for inspection #{inspection_data.get('inspection_number', 'N/A')}.</p>
            <p>Our laboratory is now processing your samples and will provide results within 3-5 business days.</p>
            <p>We will notify you as soon as your report is ready.</p>
            <p>Thank you for choosing Mold Testing Houston.</p>
            <br>
            <p>Best regards,<br>Mold Testing Houston Team</p>
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
        subject = f"Mold Testing Houston - Report Ready (Inspection #{inspection_data.get('inspection_number', 'N/A')})"
        
        body = f"""
        <html>
        <body>
            <h2>Mold Testing Houston - Report Ready</h2>
            <p>Dear {inspection_data.get('full_name', 'Valued Customer')},</p>
            <p>Your mold testing report for inspection #{inspection_data.get('inspection_number', 'N/A')} is now ready.</p>
            <p>You can download your report from your account dashboard.</p>
            <p>If you have any questions about your results, please don't hesitate to contact us.</p>
            <p>Thank you for choosing Mold Testing Houston.</p>
            <br>
            <p>Best regards,<br>Mold Testing Houston Team</p>
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
        subject = f"Mold Testing Houston - Review Request (Inspection #{inspection_data.get('inspection_number', 'N/A')})"
        
        body = f"""
        <html>
        <body>
            <h2>Mold Testing Houston - Review Request</h2>
            <p>Dear {inspection_data.get('full_name', 'Valued Customer')},</p>
            <p>Thank you for using our mold testing services. We hope you found our service helpful.</p>
            <p>If you could take a moment to leave us a review, it would mean a lot to us and help other customers make informed decisions.</p>
            <p>Thank you for choosing Mold Testing Houston.</p>
            <br>
            <p>Best regards,<br>Mold Testing Houston Team</p>
        </body>
        </html>
        """
        
        return self.send_email(
            inspection_data.get('email'),
            subject,
            body
        )

# Create service instance
email_service = EmailService()