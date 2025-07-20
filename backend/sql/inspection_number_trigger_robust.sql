-- Robust PostgreSQL Trigger and Function for Automatic Inspection Number Assignment
-- This version handles concurrent inserts and provides better error handling

-- Function to get the next inspection number with proper locking
CREATE OR REPLACE FUNCTION get_next_inspection_number()
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Use a transaction with proper locking to handle concurrent inserts
    -- This prevents race conditions when multiple inserts happen simultaneously
    
    -- Lock the table to prevent concurrent modifications during number generation
    -- This ensures we get a unique, sequential number even under high concurrency
    PERFORM pg_advisory_xact_lock(1); -- Use advisory lock for this specific operation
    
    -- Get the maximum inspection_number from the table
    -- If no records exist, start with 1
    SELECT COALESCE(MAX(inspection_number), 0) + 1
    INTO next_number
    FROM public.inspection;
    
    -- Validate the number is positive
    IF next_number <= 0 THEN
        next_number := 1;
    END IF;
    
    RETURN next_number;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and return a safe fallback
        RAISE WARNING 'Error generating inspection number: %', SQLERRM;
        RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically assign inspection number on insert
CREATE OR REPLACE FUNCTION assign_inspection_number()
RETURNS TRIGGER AS $$
DECLARE
    max_attempts INTEGER := 3;
    attempt_count INTEGER := 0;
    new_number INTEGER;
BEGIN
    -- Only assign inspection_number if it's NULL, 0, or negative
    IF NEW.inspection_number IS NULL OR NEW.inspection_number <= 0 THEN
        
        -- Try to get a unique number with retry logic
        WHILE attempt_count < max_attempts LOOP
            BEGIN
                new_number := get_next_inspection_number();
                
                -- Check if this number is already taken (double-check)
                IF EXISTS (SELECT 1 FROM public.inspection WHERE inspection_number = new_number) THEN
                    -- Number was taken by another concurrent insert, try again
                    attempt_count := attempt_count + 1;
                    CONTINUE;
                END IF;
                
                -- Number is available, assign it
                NEW.inspection_number := new_number;
                EXIT; -- Success, exit the loop
                
            EXCEPTION
                WHEN OTHERS THEN
                    -- Log the error and try again
                    RAISE WARNING 'Attempt % failed to generate inspection number: %', attempt_count + 1, SQLERRM;
                    attempt_count := attempt_count + 1;
                    
                    IF attempt_count >= max_attempts THEN
                        -- All attempts failed, use a fallback
                        RAISE EXCEPTION 'Failed to generate unique inspection number after % attempts', max_attempts;
                    END IF;
            END;
        END LOOP;
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

-- Create a unique constraint on inspection_number to prevent duplicates
-- This provides an additional safety net
ALTER TABLE public.inspection 
ADD CONSTRAINT unique_inspection_number 
UNIQUE (inspection_number);

-- Create an index on inspection_number for better performance
CREATE INDEX IF NOT EXISTS idx_inspection_number ON public.inspection(inspection_number);

-- Create a sequence as a backup method (optional)
-- This can be used if the trigger method fails
CREATE SEQUENCE IF NOT EXISTS inspection_number_seq
    START WITH 1
    INCREMENT BY 1
    NO CYCLE;

-- Function to reset the sequence to the current max value
CREATE OR REPLACE FUNCTION reset_inspection_number_sequence()
RETURNS VOID AS $$
DECLARE
    max_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(inspection_number), 0)
    INTO max_number
    FROM public.inspection;
    
    -- Reset the sequence to the current maximum + 1
    PERFORM setval('inspection_number_seq', max_number + 1, false);
    
    RAISE NOTICE 'Reset inspection_number_seq to %', max_number + 1;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION get_next_inspection_number() TO your_role;
-- GRANT EXECUTE ON FUNCTION assign_inspection_number() TO your_role;
-- GRANT EXECUTE ON FUNCTION reset_inspection_number_sequence() TO your_role;

-- Test the trigger (optional - uncomment to test)
-- INSERT INTO public.inspection (full_name, email, status) 
-- VALUES ('Test User 1', 'test1@example.com', 'pending');
-- INSERT INTO public.inspection (full_name, email, status) 
-- VALUES ('Test User 2', 'test2@example.com', 'pending');
-- SELECT * FROM public.inspection ORDER BY inspection_number DESC LIMIT 5; 