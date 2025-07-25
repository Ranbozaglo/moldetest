-- Add lab_conclusion and lab_recommendations columns to the inspection table
-- This script should be run on your Supabase database

-- Add lab_conclusion column
ALTER TABLE inspection 
ADD COLUMN IF NOT EXISTS lab_conclusion TEXT;

-- Add lab_recommendations column  
ALTER TABLE inspection 
ADD COLUMN IF NOT EXISTS lab_recommendations TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inspection' 
AND column_name IN ('lab_conclusion', 'lab_recommendations'); 