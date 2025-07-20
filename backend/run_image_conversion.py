#!/usr/bin/env python3
"""
Simple script to run the image conversion process
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from image_converter import ImageConverter

def main():
    print("🚀 Starting WebP Image Conversion for Mold Testing Houston")
    print("=" * 60)
    
    try:
        # Create converter instance
        converter = ImageConverter()
        
        # Run the conversion
        result = converter.run_conversion()
        
        print("\n✅ Conversion completed successfully!")
        print(f"📊 Results: {result['converted']}/{result['total']} images converted")
        print(f"⏱️  Duration: {result['duration']}")
        
        if result['failed'] > 0:
            print(f"⚠️  {result['failed']} images failed to convert")
        
        return 0
        
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 