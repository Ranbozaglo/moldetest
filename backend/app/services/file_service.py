import os
import uuid
from typing import List, Optional
from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class FileService:
    def __init__(self):
        """Initialize Supabase client for file storage"""
        try:
            self.supabase: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_ANON_KEY
            )
            logger.info("FileService initialized with Supabase client")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise Exception("Failed to initialize file storage service")

    async def upload_lab_analysis_image(
        self, 
        file_content: bytes, 
        file_name: str, 
        inspection_id: int
    ) -> str:
        """
        Upload lab analysis image to Supabase storage
        
        Args:
            file_content: The file content as bytes
            file_name: Original file name
            inspection_id: The inspection ID for organizing files
            
        Returns:
            str: Public URL of the uploaded file
        """
        try:
            # Generate unique filename
            file_extension = os.path.splitext(file_name)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            # Create folder path: lab-analysis-images/inspection_{id}/
            folder_path = f"lab-analysis-images/inspection_{inspection_id}"
            file_path = f"{folder_path}/{unique_filename}"
            
            logger.info(f"Uploading file to Supabase: {file_path}")
            
            # Upload to Supabase Storage
            result = self.supabase.storage.from_("lab-analysis").upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": "image/jpeg"}
            )
            
            if result.error:
                raise Exception(f"Supabase upload error: {result.error}")
            
            # Get public URL
            public_url = self.supabase.storage.from_("lab-analysis").get_public_url(file_path)
            
            logger.info(f"File uploaded successfully: {public_url}")
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise Exception(f"File upload failed: {str(e)}")

    async def delete_lab_analysis_image(self, file_url: str) -> bool:
        """
        Delete lab analysis image from Supabase storage
        
        Args:
            file_url: The public URL of the file to delete
            
        Returns:
            bool: True if deletion was successful
        """
        try:
            # Extract file path from URL
            # URL format: https://xxx.supabase.co/storage/v1/object/public/lab-analysis/path/to/file
            url_parts = file_url.split("/lab-analysis/")
            if len(url_parts) != 2:
                raise Exception("Invalid file URL format")
            
            file_path = url_parts[1]
            
            logger.info(f"Deleting file from Supabase: {file_path}")
            
            # Delete from Supabase Storage
            result = self.supabase.storage.from_("lab-analysis").remove([file_path])
            
            if result.error:
                raise Exception(f"Supabase delete error: {result.error}")
            
            logger.info("File deleted successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            raise Exception(f"File deletion failed: {str(e)}")

# Create global instance
file_service = FileService() 