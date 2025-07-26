-- Add missing columns to inspection table
-- Run this in your Supabase SQL Editor

-- Add temperature column
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inspection' 
        AND column_name = 'temperature' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inspection ADD COLUMN temperature float null;
        RAISE NOTICE 'Added temperature column to inspection table';
    ELSE
        RAISE NOTICE 'temperature column already exists in inspection table';
    END IF;
END $$;

-- Add humidity column
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inspection' 
        AND column_name = 'humidity' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inspection ADD COLUMN humidity float null;
        RAISE NOTICE 'Added humidity column to inspection table';
    ELSE
        RAISE NOTICE 'humidity column already exists in inspection table';
    END IF;
END $$;

-- Add environmental_data_method column
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inspection' 
        AND column_name = 'environmental_data_method' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inspection ADD COLUMN environmental_data_method text null;
        RAISE NOTICE 'Added environmental_data_method column to inspection table';
    ELSE
        RAISE NOTICE 'environmental_data_method column already exists in inspection table';
    END IF;
END $$; 