-- Create email_templates table for managing email template content
-- This table stores customizable email templates for different email types

CREATE TABLE IF NOT EXISTS public.email_templates (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.email_templates IS 'Stores customizable email templates for different automated email types';
COMMENT ON COLUMN public.email_templates.type IS 'Template type identifier (e.g., lab_received, report_ready, review_request)';
COMMENT ON COLUMN public.email_templates.subject IS 'Email subject line with placeholder support';
COMMENT ON COLUMN public.email_templates.body IS 'HTML email body content with placeholder support';

-- Insert default email templates
INSERT INTO public.email_templates (type, subject, body) VALUES 
(
    'lab_received',
    'Lab Sample Received - {{inspection_number}}',
    '<p>Dear {{client_name}},</p>
<p>We have received your mold testing samples for inspection <strong>{{inspection_number}}</strong>.</p>
<p><strong>Property Address:</strong> {{property_address}}</p>
<p><strong>Date Received:</strong> {{received_date}}</p>
<p>Your samples are now being processed in our laboratory. You can expect results within 3-5 business days.</p>
<p>Thank you for choosing Mold Testing Houston!</p>
<p>Best regards,<br>Mold Testing Houston Team</p>'
),
(
    'report_ready',
    'Mold Analysis Report Ready - {{inspection_number}}',
    '<p>Dear {{client_name}},</p>
<p>Your mold analysis report for inspection <strong>{{inspection_number}}</strong> is now ready!</p>
<p><strong>Property Address:</strong> {{property_address}}</p>
<p><strong>Report Date:</strong> {{report_date}}</p>
<p>You can download your complete report using the link below:</p>
<p><a href="{{report_link}}" style="background-color: #004aac; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Report</a></p>
<p>If you have any questions about your results, please don''t hesitate to contact us.</p>
<p>Best regards,<br>Mold Testing Houston Team</p>'
),
(
    'review_request',
    'Please Review Your Mold Testing Experience - {{inspection_number}}',
    '<p>Dear {{client_name}},</p>
<p>Thank you for choosing Mold Testing Houston for your recent mold analysis (Inspection {{inspection_number}}).</p>
<p><strong>Property Address:</strong> {{property_address}}</p>
<p>We hope you found our service helpful and professional. Your feedback is important to us and helps us improve our services.</p>
<p>Would you mind taking a moment to leave us a review?</p>
<p><a href="{{review_link}}" style="background-color: #004aac; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave a Review</a></p>
<p>Thank you for your time and for trusting us with your mold testing needs.</p>
<p>Best regards,<br>Mold Testing Houston Team</p>'
)
ON CONFLICT (type) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
-- GRANT SELECT ON public.email_templates TO anon; 