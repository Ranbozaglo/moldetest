#!/usr/bin/env python3
"""
Script to add missing temperature, humidity, and environmental_data_method columns to the inspection table.
Run this script to update your database schema.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from supabase import create_client, Client

def add_missing_columns():
    """Add missing columns to the inspection table."""
    
    # Initialize Supabase client
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")
        return False
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        print("🔍 Connected to Supabase")
        
        # SQL commands to add missing columns
        sql_commands = [
            """
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
            """,
            """
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
            """,
            """
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
            """
        ]
        
        # Execute each SQL command
        for i, sql in enumerate(sql_commands, 1):
            print(f"🔍 Executing SQL command {i}/3...")
            try:
                result = supabase.rpc('exec_sql', {'sql': sql}).execute()
                print(f"✅ SQL command {i} executed successfully")
            except Exception as e:
                print(f"⚠️ SQL command {i} failed: {e}")
                print("📝 You may need to run this manually in the Supabase SQL Editor")
                print("📝 SQL to run:")
                print(sql)
        
        # Verify the columns exist
        print("🔍 Verifying columns were added...")
        try:
            result = supabase.table('inspection').select('temperature, humidity, environmental_data_method').limit(1).execute()
            print("✅ Columns verified successfully")
            return True
        except Exception as e:
            print(f"❌ Error verifying columns: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting database schema update...")
    success = add_missing_columns()
    
    if success:
        print("✅ Database schema update completed successfully!")
        print("📝 The inspection table now has temperature, humidity, and environmental_data_method columns")
    else:
        print("❌ Database schema update failed!")
        print("📝 Please run the SQL commands manually in your Supabase SQL Editor")
        print("📝 See add_temperature_humidity_columns.sql for the commands") 