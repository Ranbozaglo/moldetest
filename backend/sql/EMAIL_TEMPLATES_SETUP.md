# Email System Setup Guide

This guide explains the email system for the Mold Testing Houston admin dashboard.

## Overview

The email system sends automated notifications to customers during different stages of the inspection process.

## Features

- **Automated Emails**: Send notifications when samples are received, reports are ready, and for review requests
- **SMTP Integration**: Uses SMTP for reliable email delivery
- **Admin Dashboard**: Send emails directly from the admin dashboard
- **Status Updates**: Automatically updates inspection status when emails are sent

## Email Types

### 1. Lab Received Email
- **When sent**: After lab samples are received
- **Purpose**: Notify customer that samples are being processed
- **Status update**: Changes inspection status to 'in_progress'
- **Endpoint**: `POST /api/email/send-lab-received/{inspection_id}`

### 2. Report Ready Email
- **When sent**: When mold analysis report is complete
- **Purpose**: Notify customer that report is available for download
- **Status update**: Changes inspection status to 'completed'
- **Endpoint**: `POST /api/email/send-report-ready/{inspection_id}`

### 3. Review Request Email
- **When sent**: After inspection is completed (optional)
- **Purpose**: Request customer feedback and reviews
- **Status update**: No status change
- **Endpoint**: `POST /api/email/send-review-request/{inspection_id}`

## Configuration

### SMTP Settings

Add these environment variables to your `.env` file:

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=your_email@gmail.com
```

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password as `SMTP_PASSWORD`

## Usage

### From Admin Dashboard

1. Navigate to the Admin Dashboard
2. Find the inspection you want to send an email for
3. Click the dropdown menu (three dots)
4. Select the appropriate email action:
   - "Send Lab Received Email"
   - "Send Report Ready Email"
   - "Send Review Request"

### API Endpoints

```bash
# Send lab received email
curl -X POST http://localhost:5000/api/email/send-lab-received/123

# Send report ready email
curl -X POST http://localhost:5000/api/email/send-report-ready/123

# Send review request email
curl -X POST http://localhost:5000/api/email/send-review-request/123
```

## Troubleshooting

### Email Not Sending
- Check SMTP settings in `.env` file
- Verify Gmail app password is correct
- Check server logs for SMTP errors
- Ensure inspection ID exists in database

### SMTP Authentication Errors
- Verify Gmail 2FA is enabled
- Check app password is correct
- Try using Gmail's "Less secure app access" (not recommended for production)

### Database Errors
- Verify inspection exists in database
- Check database connection
- Ensure inspection has valid email address

## Security Notes

- Emails are sent server-side for security
- Admin-only access is enforced through route protection
- SMTP credentials are stored securely in environment variables

## Customization

To customize email content, edit the email templates in `backend/app/services/email_service.py`:

```python
def send_lab_received_email(self, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
    subject = f"Mold Testing Houston - Samples Received (Inspection #{inspection_data.get('inspection_number', 'N/A')})"
    
    body = f"""
    <html>
    <body>
        <h2>Mold Testing Houston - Samples Received</h2>
        <p>Dear {inspection_data.get('full_name', 'Valued Customer')},</p>
        <!-- Customize email content here -->
    </body>
    </html>
    """
    
    return self.send_email(
        inspection_data.get('email'),
        subject,
        body
    )
``` 