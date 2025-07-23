from fastapi import APIRouter, HTTPException, status, Request
from typing import List, Optional
import json
import secrets
import uuid

router = APIRouter()

# Mock Supabase client for now - will be properly configured later
# from supabase import create_client, Client
# from app.core.config import settings
# supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

@router.post("/auth/login")
async def login(request: Request):
    """User login endpoint using Supabase"""
    try:
        data = await request.json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password required"
            )
        
        # Mock user for now
        user = {
            'id': 'mock-user-id',
            'email': email,
            'full_name': email.split('@')[0],
            'role': 'user'
        }
        
        # Generate simple token (in production, use JWT)
        token = secrets.token_urlsafe(32)
        response_data = {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user['id'],
                "email": user['email'],
                "full_name": user.get('full_name', ''),
                "is_admin": user.get('role') == 'admin'
            }
        }
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/auth/register")
async def register(request: Request):
    """User registration endpoint using Supabase"""
    try:
        data = await request.json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password required"
            )
        
        # Mock registration for now
        user_id = str(uuid.uuid4())
        
        return {
            "message": "User registered successfully",
            "user_id": user_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.get("/inspection")
async def get_inspections(
    sort_by: str = "-created_at",
    limit: int = 10
):
    """Get all inspections with complete data using Supabase"""
    try:
        # Mock data for now
        mock_inspections = [
            {
                "id": 1,
                "inspection_number": 100,
                "created_at": "2024-01-01T00:00:00Z",
                "created_date": "2024-01-01",
                "updated_date": "2024-01-01",
                "created_by_id": "mock-user-id",
                "full_name": "John Doe",
                "email": "john@example.com",
                "client_type": "homeowner",
                "street_address": "123 Main St",
                "city": "Houston",
                "state": "TX",
                "zip_code": "77001",
                "property_type": "residential",
                "square_footage": 1500,
                "has_visible_mold": False,
                "mold_locations": None,
                "mold_images": None,
                "has_water_damage": False,
                "water_damage_locations": None,
                "water_damage_images": None,
                "thermostat_image": None,
                "status": "pending",
                "is_sample": False,
                "user_id": "mock-user-id",
                "property_address": "123 Main St",
                "inspection_date": "2024-01-01",
                "summary": "Inspection for John Doe",
                "user_email": "john@example.com",
            }
        ]
        
        return mock_inspections
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch inspections: {str(e)}"
        )

@router.get("/inspection/{inspection_id}")
async def get_inspection_by_id(inspection_id: int):
    """Get a single inspection by ID using Supabase"""
    try:
        result = supabase.table('inspection').select('*').eq('id', inspection_id).execute()
        inspections = result.data
        
        if inspections and len(inspections) > 0:
            return inspections[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inspection not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch inspection: {str(e)}"
        )

@router.post("/inspection")
async def create_inspection(request: Request):
    """Create new inspection using Supabase, limit to 1 per user unless paid"""
    try:
        data = await request.json()
        user_email = data.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="Email is required")
        # Check if user already has an inspection
        existing = supabase.table('inspection').select('*').eq('email', user_email).execute()
        if existing.data and len(existing.data) > 0:
            return {"error": "User already has an inspection. Please purchase additional inspections via Stripe.", "redirect_to_stripe": True}
        # Proceed to create if none exists
        result = supabase.table('inspection').insert({
            'full_name': data.get('full_name'),
            'street_address': data.get('street_address'),
            'city': data.get('city'),
            'state': data.get('state'),
            'zip_code': data.get('zip_code'),
            'property_type': data.get('property_type'),
            'client_type': data.get('client_type'),
            'square_footage': data.get('square_footage'),
            'has_visible_mold': data.get('has_visible_mold'),
            'mold_locations': data.get('mold_locations'),
            'has_water_damage': data.get('has_water_damage'),
            'water_damage_locations': data.get('water_damage_locations'),
            'status': data.get('status', 'pending'),
            'created_by_id': data.get('user_id'),
            'email': user_email,
            'is_sample': data.get('is_sample', False)
        }).execute()
        inspection = result.data[0] if result.data else None
        return {
            "message": "Inspection created successfully",
            "inspection": inspection
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create inspection: {str(e)}"
        )

@router.put("/inspection/{inspection_id}")
async def update_inspection(inspection_id: int, request: Request):
    """Update inspection using Supabase"""
    try:
        data = await request.json()
        
        # Build update data dynamically based on what's provided
        update_data = {}
        if 'status' in data:
            update_data['status'] = data['status']
        if 'property_address' in data:
            update_data['property_address'] = data['property_address']
        if 'inspection_date' in data:
            update_data['inspection_date'] = data['inspection_date']
        if 'summary' in data:
            update_data['summary'] = data['summary']
        if 'has_visible_mold' in data:
            update_data['has_visible_mold'] = data['has_visible_mold']
        if 'has_water_damage' in data:
            update_data['has_water_damage'] = data['has_water_damage']
        if 'is_sample' in data:
            update_data['is_sample'] = data['is_sample']
        
        result = supabase.table('inspection').update(update_data).eq('id', inspection_id).execute()
        
        if result.data:
            return {"message": "Inspection updated successfully", "inspection": result.data[0]}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inspection not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update inspection: {str(e)}"
        )

@router.delete("/inspection/{inspection_id}")
async def delete_inspection(inspection_id: int):
    """Delete inspection using Supabase"""
    try:
        result = supabase.table('inspection').delete().eq('id', inspection_id).execute()
        
        if result.data:
            return {"message": "Inspection deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inspection not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete inspection: {str(e)}"
        ) 