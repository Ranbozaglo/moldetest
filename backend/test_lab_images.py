#!/usr/bin/env python3
"""
Test script to verify lab_analysis_images field handling
"""

import json
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.schemas import Inspection, InspectionUpdate
from app.core.database import DBInspection, SessionLocal

def test_lab_images_serialization():
    """Test that lab_analysis_images is properly serialized/deserialized"""
    
    print("🧪 Testing lab_analysis_images serialization...")
    
    # Test 1: Create an inspection with lab_analysis_images
    test_images = [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
    ]
    
    # Create a mock inspection object
    mock_inspection = {
        "id": 1,
        "inspection_number": 1001,
        "user_id": 1,
        "full_name": "Test User",
        "email": "test@example.com",
        "phone": "123-456-7890",
        "client_type": "homeowner",
        "street_address": "123 Test St",
        "city": "Test City",
        "state": "TX",
        "zip_code": "12345",
        "square_footage": 1500.0,
        "has_visible_mold": False,
        "has_water_damage": False,
        "status": "pending",
        "lab_analysis_images": json.dumps(test_images),  # JSON string from database
        "conclusion": "Test conclusion",
        "recommendations": "Test recommendations",
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    }
    
    print(f"📝 Mock inspection with lab_analysis_images (JSON string): {mock_inspection['lab_analysis_images']}")
    
    # Test 2: Parse using the Inspection schema
    try:
        inspection = Inspection(**mock_inspection)
        print(f"✅ Successfully parsed inspection")
        print(f"📸 lab_analysis_images after parsing: {inspection.lab_analysis_images}")
        print(f"📸 Type: {type(inspection.lab_analysis_images)}")
        print(f"📸 Length: {len(inspection.lab_analysis_images)}")
        
        # Verify it's a list
        assert isinstance(inspection.lab_analysis_images, list), "lab_analysis_images should be a list"
        assert len(inspection.lab_analysis_images) == 2, "Should have 2 images"
        
        print("✅ All assertions passed!")
        
    except Exception as e:
        print(f"❌ Error parsing inspection: {e}")
        return False
    
    # Test 3: Test with null lab_analysis_images
    mock_inspection_null = {
        **mock_inspection,
        "lab_analysis_images": None
    }
    
    try:
        inspection_null = Inspection(**mock_inspection_null)
        print(f"✅ Successfully parsed inspection with null lab_analysis_images")
        print(f"📸 lab_analysis_images: {inspection_null.lab_analysis_images}")
        assert inspection_null.lab_analysis_images == [], "Should be empty list when null"
        
    except Exception as e:
        print(f"❌ Error parsing inspection with null lab_analysis_images: {e}")
        return False
    
    # Test 4: Test with empty string
    mock_inspection_empty = {
        **mock_inspection,
        "lab_analysis_images": ""
    }
    
    try:
        inspection_empty = Inspection(**mock_inspection_empty)
        print(f"✅ Successfully parsed inspection with empty string lab_analysis_images")
        print(f"📸 lab_analysis_images: {inspection_empty.lab_analysis_images}")
        assert inspection_empty.lab_analysis_images == [], "Should be empty list when empty string"
        
    except Exception as e:
        print(f"❌ Error parsing inspection with empty string lab_analysis_images: {e}")
        return False
    
    # Test 5: Test InspectionUpdate schema
    update_data = {
        "lab_analysis_images": ["https://example.com/new_image.jpg"]
    }
    
    try:
        inspection_update = InspectionUpdate(**update_data)
        print(f"✅ Successfully created InspectionUpdate")
        print(f"📸 lab_analysis_images: {inspection_update.lab_analysis_images}")
        
    except Exception as e:
        print(f"❌ Error creating InspectionUpdate: {e}")
        return False
    
    print("🎉 All tests passed!")
    return True

def test_database_connection():
    """Test database connection and schema"""
    
    print("\n🧪 Testing database connection...")
    
    try:
        db = SessionLocal()
        
        # Check if inspections table exists and has lab_analysis_images column
        result = db.execute("PRAGMA table_info(inspections)")
        columns = result.fetchall()
        
        lab_images_column = None
        for column in columns:
            if column[1] == 'lab_analysis_images':
                lab_images_column = column
                break
        
        if lab_images_column:
            print(f"✅ lab_analysis_images column found: {lab_images_column}")
        else:
            print("❌ lab_analysis_images column not found in inspections table")
            return False
        
        # Check if there are any inspections with lab_analysis_images
        result = db.execute("SELECT id, lab_analysis_images FROM inspections WHERE lab_analysis_images IS NOT NULL LIMIT 5")
        inspections = result.fetchall()
        
        print(f"📊 Found {len(inspections)} inspections with lab_analysis_images")
        for inspection in inspections:
            print(f"  - Inspection {inspection[0]}: {inspection[1][:50]}...")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting lab_analysis_images tests...")
    
    success = True
    
    # Test serialization
    if not test_lab_images_serialization():
        success = False
    
    # Test database connection
    if not test_database_connection():
        success = False
    
    if success:
        print("\n🎉 All tests passed! The lab_analysis_images field should work correctly.")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
        sys.exit(1) 