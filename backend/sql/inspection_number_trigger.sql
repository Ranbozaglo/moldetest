-- PostgreSQL Trigger and Function for Automatic Inspection Number Assignment
-- This script creates a function and trigger to automatically assign sequential
-- inspection numbers when new records are inserted into the inspection table.

-- Function to get the next inspection number
CREATE OR REPLACE FUNCTION get_next_inspection_number()
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get the maximum inspection_number from the table
    -- If no records exist, start with 1
    SELECT COALESCE(MAX(inspection_number), 0) + 1
    INTO next_number
    FROM public.inspection;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically assign inspection number on insert
CREATE OR REPLACE FUNCTION assign_inspection_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Only assign inspection_number if it's NULL or 0
    IF NEW.inspection_number IS NULL OR NEW.inspection_number = 0 THEN
        NEW.inspection_number := get_next_inspection_number();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
-- This trigger fires BEFORE INSERT and automatically assigns an inspection number
DROP TRIGGER IF EXISTS trigger_assign_inspection_number ON public.inspection;
CREATE TRIGGER trigger_assign_inspection_number
    BEFORE INSERT ON public.inspection
    FOR EACH ROW
    EXECUTE FUNCTION assign_inspection_number();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION get_next_inspection_number() TO your_role;
-- GRANT EXECUTE ON FUNCTION assign_inspection_number() TO your_role;

-- Optional: Create an index on inspection_number for better performance
CREATE INDEX IF NOT EXISTS idx_inspection_number ON public.inspection(inspection_number);

-- Test the trigger (optional - uncomment to test)
-- INSERT INTO public.inspection (full_name, email, status) 
-- VALUES ('Test User', 'test@example.com', 'pending');
-- SELECT * FROM public.inspection ORDER BY inspection_number DESC LIMIT 5; 