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
                settings.SUPABASE_DB_KEY
            )
            logger.info("FileService initialized with Supabase client")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise Exception("Failed to initialize file storage service")

# Create global instance
file_service = FileService() 