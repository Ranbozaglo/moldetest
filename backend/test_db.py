import sqlite3
import json
from datetime import datetime

def test_database():
    try:
        # Connect to the database
        conn = sqlite3.connect('mold_testing.db')
        cursor = conn.cursor()
        
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables in database:", [table[0] for table in tables])
        
        # Check if inspections table has data
        cursor.execute("SELECT COUNT(*) FROM inspections")
        count = cursor.fetchone()[0]
        print(f"Number of inspections: {count}")
        
        if count == 0:
            print("Creating test inspection data...")
            
            # Create test inspections with the actual schema
            test_inspections = [
                {
                    'user_id': 1,
                    'property_address': '123 Main St, Houston, TX 77001',
                    'inspection_date': datetime.now().isoformat(),
                    'status': 'completed',
                    'summary': 'Test inspection completed - found mold in bathroom ceiling'
                },
                {
                    'user_id': 1,
                    'property_address': '456 Oak Ave, Houston, TX 77002',
                    'inspection_date': datetime.now().isoformat(),
                    'status': 'pending',
                    'summary': 'Test inspection pending - waiting for lab results'
                },
                {
                    'user_id': 1,
                    'property_address': '789 Pine St, Houston, TX 77003',
                    'inspection_date': datetime.now().isoformat(),
                    'status': 'in_progress',
                    'summary': 'Test inspection in progress - samples being analyzed'
                }
            ]
            
            # Insert test data
            for inspection in test_inspections:
                cursor.execute("""
                    INSERT INTO inspections (
                        user_id, property_address, inspection_date, status, summary, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    inspection['user_id'],
                    inspection['property_address'],
                    inspection['inspection_date'],
                    inspection['status'],
                    inspection['summary'],
                    datetime.now().isoformat()
                ))
            
            conn.commit()
            print("Test inspections created successfully!")
        
        # Show all inspections
        cursor.execute("SELECT id, user_id, property_address, status, summary FROM inspections")
        inspections = cursor.fetchall()
        print("\nAll inspections:")
        for inspection in inspections:
            print(f"ID: {inspection[0]}, User: {inspection[1]}, Address: {inspection[2]}, Status: {inspection[3]}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_database() 