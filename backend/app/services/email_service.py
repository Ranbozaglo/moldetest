import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, Any, Optional, List
import os
import json
from datetime import datetime


def _branded_email(
    *,
    eyebrow: str,
    title: str,
    content_html: str,
    cta_href: str = "",
    cta_label: str = "",
) -> str:
    """Shared Total Testing email chrome (matches kit purchase style)."""
    cta = ""
    if cta_href and cta_label:
        cta = f"""
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto 8px auto;">
                <tr>
                  <td align="center" bgcolor="#004aac" style="border-radius:8px;">
                    <a href="{cta_href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">
                      {cta_label}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;font-size:13px;line-height:1.5;color:#94a3b8;text-align:center;">
                If the button does not work, visit:<br>
                <a href="{cta_href}" style="color:#004aac;word-break:break-all;">{cta_href}</a>
              </p>"""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:linear-gradient(135deg,#004aac 0%,#0b2e59 100%);padding:28px 32px;text-align:center;">
              <img src="{{logo_url}}" alt="Total Testing" width="180" style="display:block;margin:0 auto 12px auto;max-width:180px;height:auto;border:0;border-radius:16px;" />
              <p style="margin:0;color:#dbeafe;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">DIY Mold Testing</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px 0;font-size:14px;color:#64748b;">{eyebrow}</p>
              <h1 style="margin:0 0 20px 0;font-size:24px;line-height:1.3;color:#0b2e59;">{title}</h1>
              {content_html}
              {cta}
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
                "body": _branded_email(
                    eyebrow="Account security",
                    title="Password reset request",
                    content_html="""
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">Hi {full_name},</p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">
                We received a request to reset your password for your Total Testing account. If you made this request, use the button below.
              </p>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#334155;">
                This link expires in 24 hours. If you did not request a reset, you can safely ignore this email.
              </p>
""",
                    cta_href="{reset_link}",
                    cta_label="Reset My Password",
                ),
            },
            "lab_received": {
                "subject": "Total Testing - Lab Samples Received (Inspection #{inspection_number})",
                "body": _branded_email(
                    eyebrow="Lab update · Inspection #{inspection_number}",
                    title="Your samples have been received",
                    content_html="""
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">Hi {full_name},</p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">
                Your mold test samples are at our lab and are now being processed.
              </p>
              <p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;color:#334155;">
                Our team is preparing your personalized report. You can expect full results and expert interpretation within 48–72 business hours.
              </p>
""",
                    cta_href="{dashboard_url}",
                    cta_label="Track My Report",
                ),
            },
            "lab_received_asbestos": {
                "subject": "Total Testing - Asbestos Lab Samples Received (Inspection #{inspection_number})",
                "body": _branded_email(
                    eyebrow="Lab update · Inspection #{inspection_number}",
                    title="Your asbestos samples have been received",
                    content_html="""
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">Hi {full_name},</p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">
                Your asbestos test samples are at our lab and are now being processed.
              </p>
              <p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;color:#334155;">
                Our team is preparing your asbestos analysis report. You can expect full results and expert interpretation within 48–72 business hours.
              </p>
""",
                    cta_href="{dashboard_url}",
                    cta_label="Track My Report",
                ),
            },
            "report_ready": {
                "subject": "Total Testing - Report Ready (Inspection #{inspection_number})",
                "body": _branded_email(
                    eyebrow="Results ready · Inspection #{inspection_number}",
                    title="Your mold report is ready",
                    content_html="""
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">Hi {full_name},</p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">
                Your lab results and mold inspection report are ready to view in your secure portal.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:bold;color:#0b2e59;">This report includes</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;">&#10003; Inspection findings</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;">&#10003; Lab-verified sample analysis</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;">&#10003; Mold types and spore levels</p>
                    <p style="margin:0;font-size:15px;color:#334155;">&#10003; Professional interpretation and next steps</p>
                  </td>
                </tr>
              </table>
""",
                    cta_href="{dashboard_url}",
                    cta_label="Access Your Report",
                ),
            },
            "report_ready_asbestos": {
                "subject": "Total Testing - Asbestos Report Ready (Inspection #{inspection_number})",
                "body": _branded_email(
                    eyebrow="Results ready · Inspection #{inspection_number}",
                    title="Your asbestos report is ready",
                    content_html="""
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">Hi {full_name},</p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">
                Your lab results and asbestos inspection report are ready to view in your secure portal.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:bold;color:#0b2e59;">This report includes</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;">&#10003; Asbestos inspection findings</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;">&#10003; Lab-verified sample analysis</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;">&#10003; Asbestos types and concentration levels</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;">&#10003; Material condition assessment</p>
                    <p style="margin:0;font-size:15px;color:#334155;">&#10003; Professional interpretation and next steps</p>
                  </td>
                </tr>
              </table>
""",
                    cta_href="{dashboard_url}",
                    cta_label="Access Your Report",
                ),
            },
            "review_request": {
                "subject": "Total Testing - Review Request (Inspection #{inspection_number})",
                "body": _branded_email(
                    eyebrow="We value your feedback · Inspection #{inspection_number}",
                    title="Would you leave us a quick review?",
                    content_html="""
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">Hi {full_name},</p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">
                Thank you again for trusting Total Testing. We hope your experience was smooth, informative, and gave you peace of mind.
              </p>
              <p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;color:#334155;">
                If you found our service helpful, a short Google review helps others find reliable help when they need it most.
              </p>
""",
                    cta_href="https://g.page/r/CYI0lXIHJ-W-EBE/review",
                    cta_label="Leave a Google Review",
                ),
            },
            "review_request_asbestos": {
                "subject": "Total Testing - Asbestos Review Request (Inspection #{inspection_number})",
                "body": _branded_email(
                    eyebrow="We value your feedback · Inspection #{inspection_number}",
                    title="Would you leave us a quick review?",
                    content_html="""
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">Hi {full_name},</p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">
                Thank you for using our asbestos testing services. We hope you found the experience helpful.
              </p>
              <p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;color:#334155;">
                If you could take a moment to leave a review, it would mean a lot to us and help other customers make informed decisions.
              </p>
""",
                    cta_href="https://g.page/r/CYI0lXIHJ-W-EBE/review",
                    cta_label="Leave a Google Review",
                ),
            },
            "inspection_created": {
                "subject": "Welcome to Total Testing - Inspection #{inspection_number} Created",
                "body": _branded_email(
                    eyebrow="Welcome · Inspection #{inspection_number}",
                    title="Your mold inspection is set up",
                    content_html="""
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">Hi {full_name},</p>
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#334155;">
                Your mold inspection has been created successfully. Here are the details:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:bold;color:#0b2e59;">Inspection details</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;"><strong>Number:</strong> {inspection_number}</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;"><strong>Property:</strong> {street_address}{unit_number}, {city}, {state} {zip_code}</p>
                    <p style="margin:0;font-size:15px;color:#334155;"><strong>Status:</strong> Ready for sample collection</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px 0;font-size:16px;font-weight:bold;color:#0b2e59;">Next steps</p>
              <ol style="margin:0 0 8px 0;padding-left:22px;font-size:15px;line-height:1.7;color:#334155;">
                <li>Collect your samples using the sampling guide</li>
                <li>Send samples to the lab with your prepaid label</li>
                <li>Track progress in your dashboard</li>
                <li>Receive your detailed report within a few business days</li>
              </ol>
""",
                    cta_href="{dashboard_url}",
                    cta_label="View My Inspections",
                ),
            },
            "inspection_created_asbestos": {
                "subject": "Welcome to Total Testing - Asbestos Inspection #{inspection_number} Created",
                "body": _branded_email(
                    eyebrow="Welcome · Inspection #{inspection_number}",
                    title="Your asbestos inspection is set up",
                    content_html="""
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155;">Hi {full_name},</p>
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#334155;">
                Your asbestos inspection has been created successfully. Here are the details:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:bold;color:#0b2e59;">Inspection details</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;"><strong>Number:</strong> {inspection_number}</p>
                    <p style="margin:0 0 6px 0;font-size:15px;color:#334155;"><strong>Property:</strong> {street_address}{unit_number}, {city}, {state} {zip_code}</p>
                    <p style="margin:0;font-size:15px;color:#334155;"><strong>Status:</strong> Ready for sample collection</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px 0;font-size:16px;font-weight:bold;color:#0b2e59;">Next steps</p>
              <ol style="margin:0 0 8px 0;padding-left:22px;font-size:15px;line-height:1.7;color:#334155;">
                <li>Collect your samples using the asbestos sampling guide</li>
                <li>Send samples to the lab with your prepaid label</li>
                <li>Track progress in your dashboard</li>
                <li>Receive your detailed asbestos report within a few business days</li>
              </ol>
""",
                    cta_href="{dashboard_url}",
                    cta_label="View My Inspections",
                ),
            },
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
        """Send lab received notification email"""
        template = self.resolve_template('lab_received')
        vars_map = self.enrich_template_data(inspection_data)
        subject = self.format_template(template['subject'], vars_map)
        body = self.format_template(template['body'], vars_map)
        return self.send_email(inspection_data.get('email'), subject, body)
    
    def send_report_ready_email(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send report ready notification email"""
        template = self.resolve_template('report_ready')
        vars_map = self.enrich_template_data(inspection_data)
        subject = self.format_template(template['subject'], vars_map)
        body = self.format_template(template['body'], vars_map)
        return self.send_email(inspection_data.get('email'), subject, body)
    
    def send_review_request_email(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send review request email"""
        template = self.resolve_template('review_request')
        vars_map = self.enrich_template_data(inspection_data)
        subject = self.format_template(template['subject'], vars_map)
        body = self.format_template(template['body'], vars_map)
        return self.send_email(inspection_data.get('email'), subject, body)
    
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

    def email_logo_url(self) -> str:
        return os.getenv('EMAIL_LOGO_URL') or f"{self.frontend_base_url()}/logos.png"

    def _unwrap_templates(self, templates: Any) -> Dict[str, Any]:
        if isinstance(templates, dict) and 'templates' in templates:
            return templates.get('templates') or {}
        return templates if isinstance(templates, dict) else {}

    def resolve_template(self, key: str) -> Dict[str, Any]:
        """Prefer branded default when saved admin template lacks logo branding."""
        saved_map = self._unwrap_templates(self.get_templates())
        default = self.default_templates.get(key) or {}
        saved = saved_map.get(key) or {}
        if saved and '{logo_url}' in str(saved.get('body') or ''):
            return saved
        return default or saved

    def enrich_template_data(self, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        out = dict(data or {})
        base = self.frontend_base_url()
        out.setdefault('dashboard_url', f"{base}/MyInspections")
        out['logo_url'] = self.email_logo_url()
        out.setdefault('full_name', out.get('full_name') or 'Customer')
        for key in (
            'street_address',
            'city',
            'state',
            'zip_code',
            'email',
            'inspection_number',
            'reset_link',
        ):
            out.setdefault(key, '')
        unit = str(out.get('unit_number') or '').strip()
        if unit and not unit.startswith(','):
            out['unit_number'] = f", {unit}"
        else:
            out['unit_number'] = unit
        return out

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
        """Send lab received notification email using stored template"""
        try:
            inspection_type = inspection_data.get('inspection_type', 'mold')
            key = 'lab_received_asbestos' if inspection_type == 'asbestos' else 'lab_received'
            template = self.resolve_template(key)
            vars_map = self.enrich_template_data(inspection_data)
            subject = self.format_template(template['subject'], vars_map)
            body = self.format_template(template['body'], vars_map)
            return self.send_email(inspection_data.get('email'), subject, body)
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error sending templated lab received email: {e}")
            return self.send_lab_received_email(inspection_data)

    def send_report_ready_email_with_template(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send report ready notification email using stored template"""
        try:
            inspection_type = inspection_data.get('inspection_type', 'mold')
            key = 'report_ready_asbestos' if inspection_type == 'asbestos' else 'report_ready'
            template = self.resolve_template(key)
            vars_map = self.enrich_template_data(inspection_data)
            subject = self.format_template(template['subject'], vars_map)
            body = self.format_template(template['body'], vars_map)
            return self.send_email(inspection_data.get('email'), subject, body)
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error sending templated report ready email: {e}")
            return self.send_report_ready_email(inspection_data)

    def send_review_request_email_with_template(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send review request email using stored template"""
        try:
            inspection_type = inspection_data.get('inspection_type', 'mold')
            key = 'review_request_asbestos' if inspection_type == 'asbestos' else 'review_request'
            template = self.resolve_template(key)
            vars_map = self.enrich_template_data(inspection_data)
            subject = self.format_template(template['subject'], vars_map)
            body = self.format_template(template['body'], vars_map)
            return self.send_email(inspection_data.get('email'), subject, body)
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error sending templated review request email: {e}")
            return self.send_review_request_email(inspection_data)

    def send_inspection_created_email_with_template(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send inspection created welcome email using stored template"""
        try:
            print(f"🔍 EMAIL DEBUG: Sending inspection created email with template")
            inspection_type = inspection_data.get('inspection_type', 'mold')
            key = 'inspection_created_asbestos' if inspection_type == 'asbestos' else 'inspection_created'
            template = self.resolve_template(key)
            vars_map = self.enrich_template_data(inspection_data)
            subject = self.format_template(template['subject'], vars_map)
            body = self.format_template(template['body'], vars_map)
            return self.send_email(inspection_data.get('email'), subject, body)
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error sending templated inspection created email: {e}")
            return {
                "success": False,
                "error": f"Failed to send inspection created email: {str(e)}",
                "message": "Error in send_inspection_created_email_with_template",
            }

    def send_password_reset_email(self, reset_data: Dict[str, Any]) -> bool:
        """Send password reset email with branded template"""
        try:
            print(f"🔧 EMAIL DEBUG: Sending password reset email to {reset_data.get('email')}")
            template = self.resolve_template('password_reset')
            if not template:
                print("❌ EMAIL DEBUG: Password reset template not found")
                return False
            template_vars = self.enrich_template_data({
                'full_name': reset_data.get('full_name', 'User'),
                'reset_link': reset_data.get('reset_link', ''),
                'email': reset_data.get('email', ''),
            })
            subject = self.format_template(template['subject'], template_vars)
            body = self.format_template(template['body'], template_vars)
            result = self.send_email(
                to_email=reset_data['email'],
                subject=subject,
                body=body,
            )
            if result.get('success'):
                print(f"✅ EMAIL DEBUG: Password reset email sent successfully to {reset_data.get('email')}")
                return True
            print(f"❌ EMAIL DEBUG: Failed to send password reset email: {result.get('error')}")
            return False
        except Exception as e:
            print(f"❌ EMAIL DEBUG: Error sending password reset email: {e}")
            return False


# Create service instance
email_service = EmailService()
