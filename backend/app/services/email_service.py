import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, Any, Optional
from app.core.config import settings
from app.schemas import EmailRequest, EmailResponse
from jinja2 import Template

class EmailService:
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.username = settings.SMTP_USERNAME
        self.password = settings.SMTP_PASSWORD
    
    async def send_email(self, request: EmailRequest) -> EmailResponse:
        """
        Send email using SMTP
        """
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.username
            msg['To'] = request.to_email
            msg['Subject'] = request.subject
            
            # Generate email content
            content = await self._generate_email_content(request.template, request.data)
            msg.attach(MIMEText(content, 'html'))
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            return EmailResponse(
                success=True,
                message_id=f"msg_{hash(request.to_email + request.subject)}"
            )
            
        except Exception as e:
            return EmailResponse(
                success=False,
                error=str(e)
            )
    
    async def _generate_email_content(self, template: str, data: Dict[str, Any]) -> str:
        """
        Generate email content from template and data
        """
        templates = {
            "lab_received": """
            <html>
            <body>
                <h2>Mold Testing Houston - Samples Received</h2>
                <p>Dear {{ customer_name }},</p>
                <p>We have received your mold testing samples for inspection #{{ inspection_number }}.</p>
                <p>Our laboratory is now processing your samples and will provide results within 3-5 business days.</p>
                <p>We will notify you as soon as your report is ready.</p>
                <p>Thank you for choosing Mold Testing Houston.</p>
                <br>
                <p>Best regards,<br>Mold Testing Houston Team</p>
            </body>
            </html>
            """,
            
            "report_ready": """
            <html>
            <body>
                <h2>Mold Testing Houston - Report Ready</h2>
                <p>Dear {{ customer_name }},</p>
                <p>Your mold testing report for inspection #{{ inspection_number }} is now ready.</p>
                <p>You can download your report from your account dashboard.</p>
                <p>If you have any questions about your results, please don't hesitate to contact us.</p>
                <p>Thank you for choosing Mold Testing Houston.</p>
                <br>
                <p>Best regards,<br>Mold Testing Houston Team</p>
            </body>
            </html>
            """,
            
            "review_request": """
            <html>
            <body>
                <h2>Mold Testing Houston - Review Request</h2>
                <p>Dear {{ customer_name }},</p>
                <p>Thank you for using our mold testing services. We hope you found our service helpful.</p>
                <p>If you could take a moment to leave us a review, it would mean a lot to us and help other customers make informed decisions.</p>
                <p>Thank you for choosing Mold Testing Houston.</p>
                <br>
                <p>Best regards,<br>Mold Testing Houston Team</p>
            </body>
            </html>
            """,
            
            "inspection_summary": """
            <html>
            <body>
                <h2>Mold Testing Houston - Inspection Summary</h2>
                <p>Dear {{ customer_name }},</p>
                <p>Here is a summary of your mold inspection #{{ inspection_number }}:</p>
                <h3>Inspection Details:</h3>
                <ul>
                    <li><strong>Address:</strong> {{ address }}</li>
                    <li><strong>Square Footage:</strong> {{ square_footage }}</li>
                    <li><strong>Visible Mold:</strong> {{ "Yes" if has_visible_mold else "No" }}</li>
                    <li><strong>Water Damage:</strong> {{ "Yes" if has_water_damage else "No" }}</li>
                </ul>
                {% if visible_mold_details %}
                <h3>Mold Locations:</h3>
                <ul>
                    {% for detail in visible_mold_details %}
                    <li>{{ detail.location }}</li>
                    {% endfor %}
                </ul>
                {% endif %}
                {% if water_damage_details %}
                <h3>Water Damage Locations:</h3>
                <ul>
                    {% for detail in water_damage_details %}
                    <li>{{ detail.location }}</li>
                    {% endfor %}
                </ul>
                {% endif %}
                <p>Thank you for choosing Mold Testing Houston.</p>
                <br>
                <p>Best regards,<br>Mold Testing Houston Team</p>
            </body>
            </html>
            """
        }
        
        template_content = templates.get(template, "")
        jinja_template = Template(template_content)
        return jinja_template.render(**data)
    
    async def send_lab_received_email(self, inspection_data: Dict[str, Any]) -> EmailResponse:
        """
        Send lab received notification email
        """
        request = EmailRequest(
            to_email=inspection_data['email'],
            subject=f"Mold Testing Houston - Samples Received (Inspection #{inspection_data['inspection_number']})",
            template="lab_received",
            data={
                "customer_name": inspection_data['full_name'],
                "inspection_number": inspection_data['inspection_number']
            }
        )
        return await self.send_email(request)
    
    async def send_report_ready_email(self, inspection_data: Dict[str, Any]) -> EmailResponse:
        """
        Send report ready notification email
        """
        request = EmailRequest(
            to_email=inspection_data['email'],
            subject=f"Mold Testing Houston - Report Ready (Inspection #{inspection_data['inspection_number']})",
            template="report_ready",
            data={
                "customer_name": inspection_data['full_name'],
                "inspection_number": inspection_data['inspection_number']
            }
        )
        return await self.send_email(request)
    
    async def send_review_request_email(self, inspection_data: Dict[str, Any]) -> EmailResponse:
        """
        Send review request email
        """
        request = EmailRequest(
            to_email=inspection_data['email'],
            subject=f"Mold Testing Houston - Review Request (Inspection #{inspection_data['inspection_number']})",
            template="review_request",
            data={
                "customer_name": inspection_data['full_name'],
                "inspection_number": inspection_data['inspection_number']
            }
        )
        return await self.send_email(request)

# Create service instance
email_service = EmailService() 