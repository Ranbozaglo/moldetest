# Email Templates Setup Guide

This guide explains how to set up the email templates feature for the Mold Testing Houston admin dashboard.

## Overview

The email templates system allows administrators to customize the content of automated emails sent to customers during different stages of the inspection process.

## Features

- **Template Management**: Create, edit, and reset email templates through the admin dashboard
- **Placeholder Variables**: Use dynamic variables like `{{client_name}}`, `{{inspection_number}}`, etc.
- **Rich Text Editor**: HTML-based email composition with formatting options
- **Template Types**: Support for Lab Received, Report Ready, and Review Request emails

## Database Setup

### 1. Create the Email Templates Table

Run the following SQL script in your Supabase SQL editor:

```bash
psql -h your-supabase-host -U postgres -d postgres -f backend/sql/create_email_templates_table.sql
```

Or execute the SQL commands directly in Supabase Dashboard > SQL Editor.

### 2. Verify Table Creation

Check that the table was created successfully:

```sql
SELECT * FROM public.email_templates;
```

You should see 3 default templates with types: `lab_received`, `report_ready`, and `review_request`.

## Frontend Setup

### 1. Install Dependencies

Make sure you have React Quill installed:

```bash
npm install react-quill
```

### 2. Access Email Settings

1. Log in as an admin user
2. Navigate to Admin Dashboard
3. Click "Email Settings" button in the header
4. Edit templates using the rich text editor

## API Endpoints

The following API endpoints are available:

- `GET /api/email-templates` - Get all email templates
- `GET /api/email-templates/{type}` - Get specific template by type
- `PUT /api/email-templates/{type}` - Update a specific template
- `POST /api/email-templates/{type}/reset` - Reset template to default

## Available Placeholder Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{client_name}}` | Customer's full name | John Smith |
| `{{inspection_number}}` | Formatted inspection number | MTH #123 |
| `{{property_address}}` | Full property address | 123 Main St, Houston, TX 77001 |
| `{{received_date}}` | Date samples were received | 12/15/2023 |
| `{{report_date}}` | Date report was generated | 12/18/2023 |
| `{{report_link}}` | Link to customer portal | https://app.moldtestinghouston.com/MyInspections |
| `{{review_link}}` | Link to Google review page | https://g.page/r/moldtestinghouston/review |

## Template Types

### 1. Lab Received (`lab_received`)
- **When sent**: After lab samples are received
- **Purpose**: Notify customer that samples are being processed
- **Status update**: Changes inspection status to 'in_progress'

### 2. Report Ready (`report_ready`)
- **When sent**: When mold analysis report is complete
- **Purpose**: Notify customer that report is available for download
- **Status update**: Changes inspection status to 'completed'

### 3. Review Request (`review_request`)
- **When sent**: After inspection is completed (optional)
- **Purpose**: Request customer feedback and reviews
- **Status update**: No status change

## Customization

### Adding New Template Types

1. Add new template type to the database:
```sql
INSERT INTO public.email_templates (type, subject, body) 
VALUES ('new_type', 'Subject Here', '<p>Body content here</p>');
```

2. Update the frontend EmailSettings.jsx:
```javascript
const templateTypes = [
  // ... existing types
  {
    id: 'new_type',
    name: 'New Type Email',
    description: 'Description of when this email is sent'
  }
];
```

3. Add backend integration in AdminDashboard.jsx:
```javascript
const sendNewTypeEmail = async (inspection) => {
  const template = await EmailTemplate.getByType('new_type');
  const processedEmail = processEmailTemplate(template, inspection);
  // ... email sending logic
};
```

### Adding New Placeholder Variables

Update the `processEmailTemplate` function in AdminDashboard.jsx:

```javascript
const placeholders = {
  // ... existing placeholders
  '{{new_variable}}': 'value_here'
};
```

## Troubleshooting

### Template Not Loading
- Check browser console for API errors
- Verify admin user has proper permissions
- Ensure backend server is running

### Variables Not Replacing
- Check placeholder syntax: `{{variable_name}}`
- Verify variable is defined in `processEmailTemplate` function
- Ensure inspection data contains required fields

### Database Errors
- Verify table exists: `\dt email_templates`
- Check table permissions for your database user
- Ensure default templates were inserted correctly

## Security Notes

- Email templates support HTML content - sanitize user input if allowing non-admin editing
- Template variables are processed server-side for security
- Admin-only access is enforced through route protection

## Backup and Recovery

To backup email templates:

```sql
COPY public.email_templates TO '/path/to/backup/email_templates.csv' DELIMITER ',' CSV HEADER;
```

To restore email templates:

```sql
COPY public.email_templates FROM '/path/to/backup/email_templates.csv' DELIMITER ',' CSV HEADER;
``` 