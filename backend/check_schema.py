import sqlite3

def check_schema():
    try:
        conn = sqlite3.connect('mold_testing.db')
        cursor = conn.cursor()
        
        # Check inspections table schema
        cursor.execute("PRAGMA table_info(inspections)")
        columns = cursor.fetchall()
        print("Inspections table columns:")
        for column in columns:
            print(f"  {column[1]} ({column[2]})")
        
        # Check users table schema
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("\nUsers table columns:")
        for column in columns:
            print(f"  {column[1]} ({column[2]})")
        
        # Check samples table schema
        cursor.execute("PRAGMA table_info(samples)")
        columns = cursor.fetchall()
        print("\nSamples table columns:")
        for column in columns:
            print(f"  {column[1]} ({column[2]})")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema() 