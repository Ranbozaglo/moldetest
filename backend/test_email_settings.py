#!/usr/bin/env python3
"""
Test script to verify Gmail SMTP settings
Run this to check if your email configuration is working
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_gmail_smtp():
    """Test Gmail SMTP connection and authentication"""
    
    print("🔧 GMAIL SMTP TEST")
    print("=" * 50)
    
    # Get settings from environment
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME", )
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("FROM_EMAIL", "")
    
    print(f"📧 SMTP Server: {smtp_server}")
    print(f"📧 SMTP Port: {smtp_port}")
    print(f"📧 Username: {username}")
    print(f"📧 Password set: {'Yes' if password else 'No'}")
    print(f"📧 From Email: {from_email}")
    print()
    
    # Check if credentials are set
    if not username or not password:
        print("❌ ERROR: SMTP_USERNAME or SMTP_PASSWORD not set in .env file")
        print()
        print("📝 SOLUTION:")
        print("1. Create a .env file in the backend directory")
        print("2. Add these lines:")
        print("   SMTP_USERNAME=your_email@gmail.com")
        print("   SMTP_PASSWORD=your_app_password")
        print("   FROM_EMAIL=your_email@gmail.com")
        return False
    
    try:
        print("🔗 Testing SMTP connection...")
        
        # Create test message
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = from_email  # Send to yourself for testing
        msg['Subject'] = "Test Email - Mold Testing Houston"
        
        body = """
        <html>
        <body>
            <h2>Test Email</h2>
            <p>This is a test email to verify SMTP settings are working correctly.</p>
            <p>If you receive this email, your Gmail SMTP configuration is working!</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Connect and send
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            print("✅ Connected to SMTP server")
            
            print("🔐 Starting TLS...")
            server.starttls()
            print("✅ TLS started")
            
            print("🔑 Attempting login...")
            server.login(username, password)
            print("✅ Login successful!")
            
            print("📤 Sending test email...")
            server.send_message(msg)
            print("✅ Test email sent successfully!")
            
            print()
            print("🎉 SUCCESS: Your Gmail SMTP settings are working correctly!")
            print("You should receive a test email shortly.")
            return True
            
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ AUTHENTICATION ERROR: {e}")
        print()
        print("🔧 COMMON SOLUTIONS:")
        print("1. Enable 2-Factor Authentication on your Gmail account")
        print("2. Generate an App Password:")
        print("   - Go to Google Account settings")
        print("   - Security → 2-Step Verification → App passwords")
        print("   - Generate password for 'Mail'")
        print("3. Use the App Password (not your regular password) as SMTP_PASSWORD")
        print("4. Make sure SMTP_USERNAME is your full Gmail address")
        return False
        
    except smtplib.SMTPException as e:
        print(f"❌ SMTP ERROR: {e}")
        return False
        
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        return False

if __name__ == "__main__":
    success = test_gmail_smtp()
    
    if not success:
        print()
        print("📋 NEXT STEPS:")
        print("1. Fix the issues above")
        print("2. Run this test again: python test_email_settings.py")
        print("3. Once test passes, try sending emails from the admin dashboard")
    else:
        print()
        print("✅ You can now use the email features in the admin dashboard!")