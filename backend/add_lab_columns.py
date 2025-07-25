#!/usr/bin/env python3
"""
Script to add lab_conclusion and lab_recommendations columns to the inspection table
"""

import os
import sys
from supabase import create_client, Client

# Add the current directory to the path so we can import config
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from config import SUPABASE_URL, SUPABASE_ANON_KEY
except ImportError:
    print("❌ Error: Could not import config. Make sure config.py exists with SUPABASE_URL and SUPABASE_ANON_KEY")
    sys.exit(1)

def add_lab_columns():
    """Add lab_conclusion and lab_recommendations columns to the inspection table"""
    
    print("🔧 Adding lab_conclusion and lab_recommendations columns to inspection table...")
    
    try:
        # Initialize Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # SQL to add the columns
        sql_commands = [
            "ALTER TABLE inspection ADD COLUMN IF NOT EXISTS lab_conclusion TEXT;",
            "ALTER TABLE inspection ADD COLUMN IF NOT EXISTS lab_recommendations TEXT;"
        ]
        
        # Execute each SQL command
        for i, sql in enumerate(sql_commands, 1):
            print(f"🔍 Executing SQL command {i}: {sql}")
            result = supabase.rpc('exec_sql', {'sql': sql}).execute()
            print(f"✅ SQL command {i} executed successfully")
        
        # Verify the columns were added
        print("🔍 Verifying columns were added...")
        verify_sql = """
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'inspection' 
        AND column_name IN ('lab_conclusion', 'lab_recommendations');
        """
        
        result = supabase.rpc('exec_sql', {'sql': verify_sql}).execute()
        print("✅ Verification result:")
        print(result.data)
        
        print("🎉 Successfully added lab_conclusion and lab_recommendations columns!")
        
    except Exception as e:
        print(f"❌ Error adding columns: {e}")
        print("💡 Alternative: You can run the SQL commands manually in your Supabase SQL editor:")
        print("   ALTER TABLE inspection ADD COLUMN IF NOT EXISTS lab_conclusion TEXT;")
        print("   ALTER TABLE inspection ADD COLUMN IF NOT EXISTS lab_recommendations TEXT;")
        return False
    
    return True

if __name__ == "__main__":
    add_lab_columns() 