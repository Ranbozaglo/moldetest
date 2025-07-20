from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

# User schemas
class UserBase(BaseModel):
    email: str
    name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Inspection schemas
class InspectionBase(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    client_type: str
    street_address: str
    city: str
    state: str
    zip_code: str
    square_footage: float
    has_visible_mold: bool = False
    has_water_damage: bool = False
    visible_mold_details: Optional[List[Dict[str, Any]]] = None
    water_damage_details: Optional[List[Dict[str, Any]]] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    client_status_detail: Optional[str] = None
    lab_analysis_images: Optional[List[str]] = None
    conclusion: Optional[str] = None
    recommendations: Optional[str] = None

class InspectionCreate(InspectionBase):
    pass

class InspectionUpdate(BaseModel):
    status: Optional[str] = None
    client_status_detail: Optional[str] = None
    visible_mold_details: Optional[List[Dict[str, Any]]] = None
    water_damage_details: Optional[List[Dict[str, Any]]] = None
    lab_analysis_images: Optional[List[str]] = None
    conclusion: Optional[str] = None
    recommendations: Optional[str] = None

class Inspection(InspectionBase):
    id: int
    inspection_number: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    @field_validator('lab_analysis_images', mode='before')
    @classmethod
    def parse_lab_analysis_images(cls, v):
        """Parse lab_analysis_images from JSON string to list"""
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v
    
    @field_validator('visible_mold_details', mode='before')
    @classmethod
    def parse_visible_mold_details(cls, v):
        """Parse visible_mold_details from JSON string to list"""
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v
    
    @field_validator('water_damage_details', mode='before')
    @classmethod
    def parse_water_damage_details(cls, v):
        """Parse water_damage_details from JSON string to list"""
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v
    
    class Config:
        from_attributes = True

# Sample schemas
class SampleBase(BaseModel):
    location: str
    sample_type: str = "swab"

class SampleCreate(SampleBase):
    inspection_id: int

class SampleUpdate(BaseModel):
    status: Optional[str] = None
    results: Optional[Dict[str, Any]] = None

class Sample(SampleBase):
    id: int
    inspection_id: int
    status: str
    results: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# LLM schemas
class LLMRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None

class LLMResponse(BaseModel):
    content: str
    usage: Dict[str, Any]

# Email schemas
class EmailRequest(BaseModel):
    to_email: str
    subject: str
    template: str
    data: Dict[str, Any]

class EmailResponse(BaseModel):
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None 