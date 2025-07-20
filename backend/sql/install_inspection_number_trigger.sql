-- Installation Script for Inspection Number Trigger
-- Run this in your Supabase SQL Editor to set up automatic inspection numbering

-- Step 1: Create the function to get the next inspection number
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

-- Step 2: Create the trigger function
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

-- Step 3: Create the trigger
DROP TRIGGER IF EXISTS trigger_assign_inspection_number ON public.inspection;
CREATE TRIGGER trigger_assign_inspection_number
    BEFORE INSERT ON public.inspection
    FOR EACH ROW
    EXECUTE FUNCTION assign_inspection_number();

-- Step 4: Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_inspection_number ON public.inspection(inspection_number);

-- Step 5: Test the trigger (optional - uncomment to test)
-- INSERT INTO public.inspection (full_name, email, status) 
-- VALUES ('Test User', 'test@example.com', 'pending');
-- SELECT * FROM public.inspection ORDER BY inspection_number DESC LIMIT 5;

-- Success message
SELECT 'Inspection number trigger installed successfully!' as status; 