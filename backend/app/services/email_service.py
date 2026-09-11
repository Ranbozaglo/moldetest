import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, Any, Optional, List
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
            "kit_purchase": {
                "subject": "Total Testing - Your {package_name} Kit Materials",
                "body": """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your kit materials</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:linear-gradient(135deg,#004aac 0%,#0b2e59 100%);padding:28px 32px;text-align:center;">
              <img src="{logo_url}" alt="Total Testing" width="180" style="display:block;margin:0 auto 12px auto;max-width:180px;height:auto;border:0;border-radius:16px;" />
              <p style="margin:0;color:#dbeafe;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">DIY Mold Testing</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px 0;font-size:14px;color:#64748b;">Purchase confirmed</p>
              <h1 style="margin:0 0 20px 0;font-size:24px;line-height:1.3;color:#0b2e59;">Your {package_name} kit is ready</h1>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">Hi {full_name},</p>
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#334155;">
                Thank you for choosing Total Testing. Your kit documents are attached to this email and also available in your dashboard.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:bold;color:#0b2e59;">Attached files</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;">&#10003; Chain of Custody (COC) for {package_name}</p>
                    <p style="margin:0;font-size:15px;color:#334155;">&#10003; Your unique prepaid return shipping label</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:16px;font-weight:bold;color:#0b2e59;">Next steps</p>
              <ol style="margin:0 0 28px 0;padding-left:22px;font-size:15px;line-height:1.7;color:#334155;">
                <li>Collect your samples using the sampling guide</li>
                <li>Complete and sign the attached COC form</li>
                <li>Pack samples + COC, then apply the prepaid shipping label</li>
                <li>Drop the package at any FedEx location</li>
              </ol>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 8px auto;">
                <tr>
                  <td align="center" bgcolor="#004aac" style="border-radius:8px;">
                    <a href="{dashboard_url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">
                      Open dashboard / downloads
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;font-size:13px;line-height:1.5;color:#94a3b8;text-align:center;">
                If the button does not work, visit:<br>
                <a href="{dashboard_url}" style="color:#004aac;word-break:break-all;">{dashboard_url}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
              <p style="margin:0 0 6px 0;font-size:14px;color:#334155;">Warm regards,<br><strong>The Total Testing Team</strong></p>
              <p style="margin:12px 0 0 0;font-size:12px;color:#94a3b8;">Test Before You Guess. · This is an automated message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
            },
            "password_reset": {
                "subject": "Total Testing - Password Reset Request",
                "body": """<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #004aac; margin: 0;">Total Testing</h1>
            <p style="color: #666; margin: 5px 0 0 0;">DIY Mold Testing</p>
        </div>
        
        <h2 style="color: #004aac;">Password Reset Request</h2>
        
        <p>Hi {full_name},</p>
        
        <p>We received a request to reset your password for your Total Testing account. If you made this request, click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #004aac; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset My Password</a>
        </div>
        
        <p>This link will expire in 24 hours for security reasons.</p>
        
        <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        
        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #004aac;">{reset_link}</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px;">
            If you have any questions or concerns, please contact our support team.<br>
            This is an automated message, please do not reply to this email.
        </p>
        
        <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Total Testing Team
        </p>
    </div>
</body>
</html>"""
            },
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
            "lab_received_asbestos": {
                "subject": "Total Testing - Asbestos Lab Samples Received (Inspection #{inspection_number})",
                "body": """<html>
<body>
    <p>Hi {full_name},</p>
    
    <p>Just a quick update, your asbestos test samples have been received by our lab and are now being processed.</p>
    
    <p>Our team is reviewing the findings and preparing your personalized asbestos analysis report. You can expect to receive your full results and expert interpretation within 48–72 business hours.</p>
    
    <p>You can track the status of your report here: <a href="{dashboard_url}" style="color: #004aac; text-decoration: none; font-weight: bold;">Track My Report</a></p>
    
    <p>We'll notify you the moment your report is ready.</p>
    
    <p>Thank you for trusting Total Testing with your asbestos testing needs!</p>
    
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
            "report_ready_asbestos": {
                "subject": "Total Testing - Asbestos Report Ready (Inspection #{inspection_number})",
                "body": """<html>
<body>
    <p>Hi {full_name},</p>
    
    <p>Your lab results and asbestos inspection report are now ready to view in your secure portal.</p>
    
    <p><strong>This report includes:</strong></p>
    <ul style="margin-left: 20px; line-height: 1.6;">
        <li>Asbestos inspection findings</li>
        <li>Lab-verified analysis of your samples</li>
        <li>Asbestos types identified and concentration levels</li>
        <li>Material condition assessment</li>
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
            "review_request_asbestos": {
                "subject": "Total Testing - Asbestos Review Request (Inspection #{inspection_number})",
                "body": """<html>
<body>
    <h2>Total Testing - Asbestos Review Request</h2>
    <p>Dear {full_name},</p>
    <p>Thank you for using our asbestos testing services. We hope you found our service helpful.</p>
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
            },
            "inspection_created_asbestos": {
                "subject": "Welcome to Total Testing - Asbestos Inspection #{inspection_number} Created",
                "body": """<html>
<body>
    <h2>Welcome to Total Testing!</h2>
    <p>Dear {full_name},</p>
    <p>Congratulations! Your asbestos inspection has been successfully created.</p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h3 style="color: #004aac; margin-top: 0;">Your Asbestos Inspection Details:</h3>
        <p><strong>Inspection Number:</strong> {inspection_number}</p>
        <p><strong>Property Address:</strong> {street_address}{unit_number}, {city}, {state} {zip_code}</p>
        <p><strong>Status:</strong> Ready for Sample Collection</p>
    </div>
    
    <h3>📋 Next Steps:</h3>
    <ol>
        <li><strong>Collect Your Samples:</strong> Follow the asbestos sampling guide provided during your inspection setup</li>
        <li><strong>Send Samples to Lab:</strong> Use the prepaid shipping materials to send your samples</li>
        <li><strong>Track Progress:</strong> Monitor your inspection status in your dashboard</li>
        <li><strong>Receive Results:</strong> Get your detailed asbestos analysis report within 3-5 business days</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{dashboard_url}" style="background-color: #004aac; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View My Inspections
        </a>
    </div>
    
    <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
    <p>Thank you for choosing Total Testing for your asbestos inspection needs!</p>
    
    <br>
    <p>Best regards,<br>The Total Testing Team</p>
    
    <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
    <p style="font-size: 12px; color: #6c757d;">
        This email was sent to {email} regarding asbestos inspection #{inspection_number}. 
        You received this because you created a new asbestos inspection with Total Testing.
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
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Send email using SMTP.
        attachments: optional list of {filename, content (bytes), mime (optional)}
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
            msg = MIMEMultipart('mixed')
            display_from = os.getenv("FROM_NAME", "Total Testing").strip() or "Total Testing"
            from_addr = self.from_email or self.username
            msg['From'] = f"{display_from} <{from_addr}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            msg['Reply-To'] = os.getenv("REPLY_TO_EMAIL", from_addr)
            msg['X-Mailer'] = "Total Testing Kit Fulfillment"

            # HTML + plain text alternative (better inbox placement than HTML-only)
            alt = MIMEMultipart('alternative')
            plain = (
                "Total Testing — your kit materials\n\n"
                "Your Chain of Custody (COC) and prepaid shipping label are attached.\n"
                "You can also download them from your dashboard.\n\n"
                "— The Total Testing Team\n"
            )
            alt.attach(MIMEText(plain, 'plain', 'utf-8'))
            alt.attach(MIMEText(body, 'html', 'utf-8'))
            msg.attach(alt)

            for item in attachments or []:
                filename = str(item.get('filename') or 'attachment.bin')
                content = item.get('content') or b''
                if isinstance(content, str):
                    content = content.encode('utf-8')
                mime = str(item.get('mime') or 'application/octet-stream')
                maintype, _, subtype = mime.partition('/')
                if not subtype:
                    maintype, subtype = 'application', 'octet-stream'
                part = MIMEBase(maintype, subtype)
                part.set_payload(content)
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', 'attachment', filename=filename)
                msg.attach(part)
            
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

    def send_kit_purchase_email(
        self,
        to_email: str,
        full_name: str,
        package_name: str,
        dashboard_url: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Send post-purchase kit email with COC + prepaid label attachments."""
        templates = self.get_templates() if hasattr(self, 'get_templates') else self.default_templates
        # get_templates may return wrapped structure
        if isinstance(templates, dict) and 'templates' in templates:
            templates = templates.get('templates') or {}
        # Always prefer the current branded default for kit purchase layout
        # (admin JSON may still hold an older plain template without logo).
        template = self.default_templates.get('kit_purchase')
        saved = (templates or {}).get('kit_purchase')
        if saved and '{logo_url}' in str(saved.get('body') or ''):
            template = saved
        if not template:
            return {"success": False, "error": "kit_purchase template missing"}

        base = self.frontend_base_url()
        logo_url = os.getenv('EMAIL_LOGO_URL') or f"{base}/logos.png"
        vars_map = {
            'full_name': full_name or 'Customer',
            'package_name': package_name or 'Mold Testing',
            'dashboard_url': dashboard_url or f"{base}/MyInspections",
            'logo_url': logo_url,
        }
        try:
            subject = template['subject'].format(**vars_map)
            body = template['body'].format(**vars_map)
        except Exception:
            subject = f"Total Testing - Your {vars_map['package_name']} Kit Materials"
            body = self.default_templates['kit_purchase']['body'].format(**vars_map)

        return self.send_email(
            to_email=to_email,
            subject=subject,
            body=body,
            attachments=attachments or [],
        )
    
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
    
    def frontend_base_url(self) -> str:
        """Public frontend origin for email links (no trailing slash)."""
        raw = (os.getenv('FRONTEND_URL') or 'https://total-testing-diy.com').strip().rstrip('/')
        if raw and not raw.startswith('http://') and not raw.startswith('https://'):
            raw = f'https://{raw}'
        return raw or 'https://total-testing-diy.com'

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
            
            # Determine template based on inspection type
            inspection_type = inspection_data.get('inspection_type', 'mold')
            if inspection_type == 'asbestos':
                template = templates.get('lab_received_asbestos', self.default_templates['lab_received_asbestos'])
            else:
                template = templates.get('lab_received', self.default_templates['lab_received'])
            
            # Add dashboard URL to inspection data
            inspection_data_with_url = inspection_data.copy()
            dashboard_url = self.frontend_base_url() + '/MyInspections'
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
            
            # Determine template based on inspection type
            inspection_type = inspection_data.get('inspection_type', 'mold')
            if inspection_type == 'asbestos':
                template = templates.get('report_ready_asbestos', self.default_templates['report_ready_asbestos'])
            else:
                template = templates.get('report_ready', self.default_templates['report_ready'])
            
            # Add dashboard URL to inspection data
            inspection_data_with_url = inspection_data.copy()
            dashboard_url = self.frontend_base_url() + '/MyInspections'
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
            
            # Determine template based on inspection type
            inspection_type = inspection_data.get('inspection_type', 'mold')
            if inspection_type == 'asbestos':
                template = templates.get('review_request_asbestos', self.default_templates['review_request_asbestos'])
            else:
                template = templates.get('review_request', self.default_templates['review_request'])
            
            # Add dashboard URL to inspection data (for future template use)
            inspection_data_with_url = inspection_data.copy()
            dashboard_url = self.frontend_base_url() + '/MyInspections'
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
            
            # Determine template based on inspection type
            inspection_type = inspection_data.get('inspection_type', 'mold')
            if inspection_type == 'asbestos':
                template = templates.get('inspection_created_asbestos', self.default_templates['inspection_created_asbestos'])
            else:
                template = templates.get('inspection_created', self.default_templates['inspection_created'])
            
            # Add dashboard URL to inspection data
            inspection_data_with_url = inspection_data.copy()
            dashboard_url = self.frontend_base_url() + '/MyInspections'
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
    
    def send_password_reset_email(self, reset_data: Dict[str, Any]) -> bool:
        """
        Send password reset email with template
        
        Args:
            reset_data: Dictionary containing:
                - email: User's email address
                - full_name: User's full name (optional)
                - reset_link: Password reset link
                - token: Reset token (for logging)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            print(f"🔧 EMAIL DEBUG: Sending password reset email to {reset_data.get('email')}")
            
            # Get templates and find password reset template
            templates = self.get_templates()
            template = templates.get('password_reset', self.default_templates.get('password_reset'))
            
            if not template:
                print("❌ EMAIL DEBUG: Password reset template not found")
                return False
            
            # Prepare template variables
            template_vars = {
                'full_name': reset_data.get('full_name', 'User'),
                'reset_link': reset_data.get('reset_link', ''),
                'email': reset_data.get('email', '')
            }
            
            # Format subject and body
            subject = template['subject'].format(**template_vars)
            body = template['body'].format(**template_vars)
            
            # Send email
            result = self.send_email(
                to_email=reset_data['email'],
                subject=subject,
                body=body
            )
            
            if result.get('success'):
                print(f"✅ EMAIL DEBUG: Password reset email sent successfully to {reset_data.get('email')}")
                return True
            else:
                print(f"❌ EMAIL DEBUG: Failed to send password reset email: {result.get('error')}")
                return False
                
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error sending password reset email: {e}")
            return False


# Create service instance
email_service = EmailService()