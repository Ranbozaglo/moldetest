-- Test Script for Inspection Number Trigger
-- Run this in your Supabase SQL Editor to test the trigger

-- Step 1: Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'inspection' 
AND trigger_name = 'trigger_assign_inspection_number';

-- Step 2: Check if the functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('get_next_inspection_number', 'assign_inspection_number');

-- Step 3: Check current inspection numbers
SELECT 
    id,
    inspection_number,
    full_name,
    email,
    created_date
FROM public.inspection 
ORDER BY inspection_number DESC 
LIMIT 10;

-- Step 4: Test inserting a new inspection (uncomment to test)
-- INSERT INTO public.inspection (full_name, email, status) 
-- VALUES ('Test User', 'test@example.com', 'pending');

-- Step 5: Check the result (uncomment after step 4)
-- SELECT 
--     id,
--     inspection_number,
--     full_name,
--     email,
--     created_date
-- FROM public.inspection 
-- WHERE full_name = 'Test User'
-- ORDER BY created_date DESC 
-- LIMIT 1;

-- Step 6: Check for any NULL inspection_numbers
SELECT 
    COUNT(*) as null_inspection_numbers
FROM public.inspection 
WHERE inspection_number IS NULL;

-- Step 7: Check for duplicate inspection_numbers
SELECT 
    inspection_number,
    COUNT(*) as count
FROM public.inspection 
WHERE inspection_number IS NOT NULL
GROUP BY inspection_number 
HAVING COUNT(*) > 1
ORDER BY inspection_number; 