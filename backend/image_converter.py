#!/usr/bin/env python3
"""
Image Converter Script for Mold Testing Houston
Converts all images in the database to WebP format for better performance and smaller file sizes.
"""

import os
import json
import requests
from PIL import Image
import io
import uuid
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client.
# Prefer the service_role key (bypasses RLS so this maintenance script keeps
# working after RLS is enabled); fall back to the anon key for local use.
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_DB_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_DB_KEY)

class ImageConverter:
    def __init__(self):
        self.converted_count = 0
        self.failed_count = 0
        self.total_images = 0
        self.conversion_log = []
        
    def convert_image_to_webp(self, image_url, quality=85):
        """
        Convert an image from URL to WebP format
        """
        try:
            # Download the image
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Open image with PIL
            image = Image.open(io.BytesIO(response.content))
            
            # Convert to RGB if necessary (WebP doesn't support RGBA)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to WebP
            webp_buffer = io.BytesIO()
            image.save(webp_buffer, format='WebP', quality=quality, optimize=True)
            webp_buffer.seek(0)
            
            return webp_buffer.getvalue()
            
        except Exception as e:
            print(f"❌ Error converting image {image_url}: {e}")
            return None
    
    def upload_webp_to_supabase(self, webp_data, original_url, bucket_name="mold-images"):
        """
        Upload WebP image to Supabase Storage
        """
        try:
            # Generate unique filename
            file_extension = ".webp"
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            # Determine folder based on original URL
            if "lab-analysis" in original_url:
                folder_path = "lab-analysis-images"
                bucket_name = "lab-analysis"
            else:
                folder_path = "mold-inspections"
            
            file_path = f"{folder_path}/{unique_filename}"
            
            print(f"🔍 DEBUG: Uploading WebP to {bucket_name}/{file_path}")
            
            # Upload to Supabase Storage
            upload_result = supabase.storage.from_(bucket_name).upload(
                path=file_path,
                file=webp_data,
                file_options={"content-type": "image/webp"}
            )
            
            if hasattr(upload_result, 'error') and upload_result.error:
                print(f"❌ Supabase upload error: {upload_result.error}")
                return None
            
            # Get public URL
            public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
            
            print(f"✅ WebP uploaded successfully: {public_url}")
            return public_url
            
        except Exception as e:
            print(f"❌ Error uploading WebP: {e}")
            return None
    
    def delete_original_image(self, original_url):
        """
        Delete the original image from Supabase Storage
        """
        try:
            # Extract file path from URL
            # URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
            url_parts = original_url.split("/object/public/")
            if len(url_parts) != 2:
                print(f"⚠️ Could not parse URL format: {original_url}")
                return False
            
            bucket_and_path = url_parts[1]
            bucket_name, file_path = bucket_and_path.split("/", 1)
            
            print(f"🔍 DEBUG: Deleting original image: {bucket_name}/{file_path}")
            
            # Delete from Supabase Storage
            delete_result = supabase.storage.from_(bucket_name).remove([file_path])
            
            if hasattr(delete_result, 'error') and delete_result.error:
                print(f"❌ Delete error: {delete_result.error}")
                return False
            
            print(f"✅ Original image deleted: {original_url}")
            return True
            
        except Exception as e:
            print(f"❌ Error deleting original image: {e}")
            return False
    
    def update_database_record(self, table_name, record_id, field_name, new_url):
        """
        Update database record with new WebP URL
        """
        try:
            update_result = supabase.table(table_name).update({
                field_name: new_url
            }).eq('id', record_id).execute()
            
            if hasattr(update_result, 'error') and update_result.error:
                print(f"❌ Database update error: {update_result.error}")
                return False
            
            print(f"✅ Database updated: {table_name}.{field_name} for record {record_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error updating database: {e}")
            return False
    
    def process_inspection_images(self):
        """
        Process all images in inspection records
        """
        print("🔍 Starting inspection images conversion...")
        
        try:
            # Get all inspections
            inspections_result = supabase.table('inspection').select('*').execute()
            inspections = inspections_result.data
            
            print(f"📊 Found {len(inspections)} inspections to process")
            
            for inspection in inspections:
                print(f"\n🔍 Processing inspection {inspection.get('id')}...")
                
                # Process thermostat_image
                if inspection.get('thermostat_image'):
                    print(f"  📸 Converting thermostat_image: {inspection['thermostat_image']}")
                    self.convert_and_update_image(
                        inspection['thermostat_image'],
                        'inspection',
                        inspection['id'],
                        'thermostat_image'
                    )
                
                # Process visible_mold_details
                if inspection.get('visible_mold_details'):
                    try:
                        mold_details = json.loads(inspection['visible_mold_details']) if isinstance(inspection['visible_mold_details'], str) else inspection['visible_mold_details']
                        updated_mold_details = []
                        
                        for detail in mold_details:
                            if detail.get('images'):
                                updated_images = []
                                for image_url in detail['images']:
                                    new_url = self.convert_and_update_image(
                                        image_url,
                                        'inspection',
                                        inspection['id'],
                                        'visible_mold_details',
                                        is_array_item=True
                                    )
                                    if new_url:
                                        updated_images.append(new_url)
                                    else:
                                        updated_images.append(image_url)  # Keep original if conversion fails
                                
                                detail['images'] = updated_images
                            updated_mold_details.append(detail)
                        
                        # Update the entire visible_mold_details field
                        if updated_mold_details != mold_details:
                            supabase.table('inspection').update({
                                'visible_mold_details': json.dumps(updated_mold_details)
                            }).eq('id', inspection['id']).execute()
                            print(f"  ✅ Updated visible_mold_details for inspection {inspection['id']}")
                    
                    except Exception as e:
                        print(f"  ❌ Error processing visible_mold_details: {e}")
                
                # Process water_damage_details
                if inspection.get('water_damage_details'):
                    try:
                        water_details = json.loads(inspection['water_damage_details']) if isinstance(inspection['water_damage_details'], str) else inspection['water_damage_details']
                        updated_water_details = []
                        
                        for detail in water_details:
                            if detail.get('images'):
                                updated_images = []
                                for image_url in detail['images']:
                                    new_url = self.convert_and_update_image(
                                        image_url,
                                        'inspection',
                                        inspection['id'],
                                        'water_damage_details',
                                        is_array_item=True
                                    )
                                    if new_url:
                                        updated_images.append(new_url)
                                    else:
                                        updated_images.append(image_url)  # Keep original if conversion fails
                                
                                detail['images'] = updated_images
                            updated_water_details.append(detail)
                        
                        # Update the entire water_damage_details field
                        if updated_water_details != water_details:
                            supabase.table('inspection').update({
                                'water_damage_details': json.dumps(updated_water_details)
                            }).eq('id', inspection['id']).execute()
                            print(f"  ✅ Updated water_damage_details for inspection {inspection['id']}")
                    
                    except Exception as e:
                        print(f"  ❌ Error processing water_damage_details: {e}")
                
                # Process lab_analysis_images
                if inspection.get('lab_analysis_images'):
                    try:
                        lab_images = json.loads(inspection['lab_analysis_images']) if isinstance(inspection['lab_analysis_images'], str) else inspection['lab_analysis_images']
                        updated_lab_images = []
                        
                        for image_url in lab_images:
                            new_url = self.convert_and_update_image(
                                image_url,
                                'inspection',
                                inspection['id'],
                                'lab_analysis_images',
                                is_array_item=True
                            )
                            if new_url:
                                updated_lab_images.append(new_url)
                            else:
                                updated_lab_images.append(image_url)  # Keep original if conversion fails
                        
                        # Update the entire lab_analysis_images field
                        if updated_lab_images != lab_images:
                            supabase.table('inspection').update({
                                'lab_analysis_images': json.dumps(updated_lab_images)
                            }).eq('id', inspection['id']).execute()
                            print(f"  ✅ Updated lab_analysis_images for inspection {inspection['id']}")
                    
                    except Exception as e:
                        print(f"  ❌ Error processing lab_analysis_images: {e}")
        
        except Exception as e:
            print(f"❌ Error processing inspections: {e}")
    
    def process_sample_images(self):
        """
        Process all images in sample records
        """
        print("\n🔍 Starting sample images conversion...")
        
        try:
            # Get all samples
            samples_result = supabase.table('samples').select('*').execute()
            samples = samples_result.data
            
            print(f"📊 Found {len(samples)} samples to process")
            
            for sample in samples:
                if sample.get('sample_image'):
                    print(f"  📸 Converting sample_image for sample {sample.get('id')}: {sample['sample_image']}")
                    self.convert_and_update_image(
                        sample['sample_image'],
                        'samples',
                        sample['id'],
                        'sample_image'
                    )
        
        except Exception as e:
            print(f"❌ Error processing samples: {e}")
    
    def convert_and_update_image(self, image_url, table_name, record_id, field_name, is_array_item=False):
        """
        Convert image to WebP and update database record
        """
        try:
            self.total_images += 1
            
            # Skip if already WebP
            if image_url.endswith('.webp') or 'webp' in image_url.lower():
                print(f"    ⏭️  Already WebP format: {image_url}")
                return image_url
            
            # Convert image to WebP
            webp_data = self.convert_image_to_webp(image_url)
            if not webp_data:
                self.failed_count += 1
                return None
            
            # Upload WebP to Supabase
            new_url = self.upload_webp_to_supabase(webp_data, image_url)
            if not new_url:
                self.failed_count += 1
                return None
            
            # Delete original image
            self.delete_original_image(image_url)
            
            # Update database record
            if not is_array_item:
                self.update_database_record(table_name, record_id, field_name, new_url)
            
            self.converted_count += 1
            print(f"    ✅ Converted to WebP: {image_url} → {new_url}")
            
            return new_url
            
        except Exception as e:
            print(f"    ❌ Error in convert_and_update_image: {e}")
            self.failed_count += 1
            return None
    
    def run_conversion(self):
        """
        Run the complete image conversion process
        """
        print("🚀 Starting WebP Image Conversion Process")
        print("=" * 50)
        
        start_time = datetime.now()
        
        # Process all image types
        self.process_inspection_images()
        self.process_sample_images()
        
        end_time = datetime.now()
        duration = end_time - start_time
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 CONVERSION SUMMARY")
        print("=" * 50)
        print(f"Total images processed: {self.total_images}")
        print(f"Successfully converted: {self.converted_count}")
        print(f"Failed conversions: {self.failed_count}")
        print(f"Success rate: {(self.converted_count / self.total_images * 100):.1f}%" if self.total_images > 0 else "No images processed")
        print(f"Duration: {duration}")
        print("=" * 50)
        
        return {
            'total': self.total_images,
            'converted': self.converted_count,
            'failed': self.failed_count,
            'duration': str(duration)
        }

def main():
    """
    Main function to run the image conversion
    """
    try:
        converter = ImageConverter()
        result = converter.run_conversion()
        
        # Save conversion log
        with open('image_conversion_log.json', 'w') as f:
            json.dump(result, f, indent=2, default=str)
        
        print(f"\n✅ Conversion completed! Log saved to image_conversion_log.json")
        
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 