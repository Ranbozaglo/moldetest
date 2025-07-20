from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db, Inspection as DBInspection
from app.schemas import Inspection, InspectionCreate, InspectionUpdate
from app.services.llm_service import llm_service
from app.services.email_service import email_service
from app.services.file_service import file_service
import json

router = APIRouter()

@router.post("/", response_model=Inspection)
async def create_inspection(
    inspection: InspectionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new inspection
    """
    try:
        # Get next inspection number
        latest_inspection = db.query(DBInspection).order_by(DBInspection.inspection_number.desc()).first()
        next_number = 1001 if not latest_inspection else latest_inspection.inspection_number + 1
        
        # Create inspection
        db_inspection = DBInspection(
            inspection_number=next_number,
            user_id=1,  # TODO: Get from auth
            full_name=inspection.full_name,
            email=inspection.email,
            phone=inspection.phone,
            client_type=inspection.client_type,
            street_address=inspection.street_address,
            city=inspection.city,
            state=inspection.state,
            zip_code=inspection.zip_code,
            square_footage=inspection.square_footage,
            has_visible_mold=inspection.has_visible_mold,
            has_water_damage=inspection.has_water_damage,
            visible_mold_details=json.dumps(inspection.visible_mold_details) if inspection.visible_mold_details else None,
            water_damage_details=json.dumps(inspection.water_damage_details) if inspection.water_damage_details else None,
            temperature=inspection.temperature,
            humidity=inspection.humidity,
            client_status_detail=inspection.client_status_detail or "Inspection submitted - awaiting sample collection"
        )
        
        db.add(db_inspection)
        db.commit()
        db.refresh(db_inspection)
        
        return db_inspection
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create inspection: {str(e)}"
        )

@router.get("/", response_model=List[Inspection])
async def get_inspections(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all inspections with optional filtering
    """
    try:
        query = db.query(DBInspection)
        
        # Apply status filter
        if status_filter and status_filter != "all":
            query = query.filter(DBInspection.status == status_filter)
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (DBInspection.full_name.ilike(search_term)) |
                (DBInspection.email.ilike(search_term)) |
                (DBInspection.street_address.ilike(search_term)) |
                (DBInspection.inspection_number.cast(String).ilike(search_term))
            )
        
        # Apply pagination
        inspections = query.offset(skip).limit(limit).all()
        
        return inspections
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch inspections: {str(e)}"
        )

@router.get("/{inspection_id}", response_model=Inspection)
async def get_inspection(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific inspection by ID
    """
    try:
        inspection = db.query(DBInspection).filter(DBInspection.id == inspection_id).first()
        
        if not inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inspection not found"
            )
        
        return inspection
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch inspection: {str(e)}"
        )

@router.put("/{inspection_id}", response_model=Inspection)
async def update_inspection(
    inspection_id: int,
    inspection_update: InspectionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an inspection
    """
    try:
        db_inspection = db.query(DBInspection).filter(DBInspection.id == inspection_id).first()
        
        if not db_inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inspection not found"
            )
        
        # Update fields
        update_data = inspection_update.dict(exclude_unset=True)
        
        # Handle JSON fields
        if inspection_update.visible_mold_details is not None:
            update_data['visible_mold_details'] = json.dumps(inspection_update.visible_mold_details)
        if inspection_update.water_damage_details is not None:
            update_data['water_damage_details'] = json.dumps(inspection_update.water_damage_details)
        if inspection_update.lab_analysis_images is not None:
            update_data['lab_analysis_images'] = json.dumps(inspection_update.lab_analysis_images)
        
        for field, value in update_data.items():
            setattr(db_inspection, field, value)
        
        db.commit()
        db.refresh(db_inspection)
        
        return db_inspection
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update inspection: {str(e)}"
        )

@router.delete("/{inspection_id}")
async def delete_inspection(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete an inspection
    """
    try:
        db_inspection = db.query(DBInspection).filter(DBInspection.id == inspection_id).first()
        
        if not db_inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inspection not found"
            )
        
        db.delete(db_inspection)
        db.commit()
        
        return {"message": "Inspection deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete inspection: {str(e)}"
        )

@router.post("/{inspection_id}/generate-summary")
async def generate_inspection_summary(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate LLM summary for an inspection
    """
    try:
        inspection = db.query(DBInspection).filter(DBInspection.id == inspection_id).first()
        
        if not inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inspection not found"
            )
        
        # Convert to dict for LLM service
        inspection_data = {
            "full_name": inspection.full_name,
            "street_address": inspection.street_address,
            "city": inspection.city,
            "state": inspection.state,
            "square_footage": inspection.square_footage,
            "has_visible_mold": inspection.has_visible_mold,
            "has_water_damage": inspection.has_water_damage,
            "visible_mold_details": json.loads(inspection.visible_mold_details) if inspection.visible_mold_details else [],
            "water_damage_details": json.loads(inspection.water_damage_details) if inspection.water_damage_details else []
        }
        
        # Generate summary using LLM
        summary = await llm_service.generate_inspection_summary(inspection_data)
        
        return {"summary": summary}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )

@router.post("/{inspection_id}/send-email/{email_type}")
async def send_inspection_email(
    inspection_id: int,
    email_type: str,
    db: Session = Depends(get_db)
):
    """
    Send email for an inspection
    """
    try:
        inspection = db.query(DBInspection).filter(DBInspection.id == inspection_id).first()
        
        if not inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inspection not found"
            )
        
        # Convert to dict for email service
        inspection_data = {
            "email": inspection.email,
            "full_name": inspection.full_name,
            "inspection_number": inspection.inspection_number
        }
        
        # Send email based on type
        if email_type == "lab_received":
            result = await email_service.send_lab_received_email(inspection_data)
        elif email_type == "report_ready":
            result = await email_service.send_report_ready_email(inspection_data)
        elif email_type == "review_request":
            result = await email_service.send_review_request_email(inspection_data)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email type"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        ) 

@router.post("/{inspection_id}/upload-lab-image")
async def upload_lab_analysis_image(
    inspection_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload lab analysis image for an inspection
    
    This endpoint:
    1. Uploads the image to Supabase lab-analysis bucket
    2. Gets the public URL of the uploaded image
    3. Adds the URL to the lab_analysis_images array in the inspection record
    4. Returns the updated inspection data
    """
    try:
        # Validate inspection exists
        inspection = db.query(DBInspection).filter(DBInspection.id == inspection_id).first()
        if not inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inspection with ID {inspection_id} not found"
            )
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only image files are allowed"
            )
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        file_content = await file.read()
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds 10MB limit"
            )
        
        # Upload file to Supabase storage
        public_url = await file_service.upload_lab_analysis_image(
            file_content=file_content,
            file_name=file.filename,
            inspection_id=inspection_id
        )
        
        # Get current lab_analysis_images array
        current_images = []
        if inspection.lab_analysis_images:
            try:
                current_images = json.loads(inspection.lab_analysis_images)
            except json.JSONDecodeError:
                current_images = []
        
        # Append new image URL to array
        current_images.append(public_url)
        
        # Update inspection record with new image array
        inspection.lab_analysis_images = json.dumps(current_images)
        db.commit()
        db.refresh(inspection)
        
        return {
            "message": "Lab analysis image uploaded successfully",
            "inspection_id": inspection_id,
            "image_url": public_url,
            "total_images": len(current_images),
            "updated_inspection": inspection
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload lab analysis image: {str(e)}"
        )

@router.delete("/{inspection_id}/lab-image/{image_index}")
async def delete_lab_analysis_image(
    inspection_id: int,
    image_index: int,
    db: Session = Depends(get_db)
):
    """
    Delete a specific lab analysis image from an inspection
    """
    try:
        # Validate inspection exists
        inspection = db.query(DBInspection).filter(DBInspection.id == inspection_id).first()
        if not inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inspection with ID {inspection_id} not found"
            )
        
        # Get current lab_analysis_images array
        current_images = []
        if inspection.lab_analysis_images:
            try:
                current_images = json.loads(inspection.lab_analysis_images)
            except json.JSONDecodeError:
                current_images = []
        
        # Validate image index
        if image_index < 0 or image_index >= len(current_images):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image index {image_index} is out of range"
            )
        
        # Get image URL to delete from storage
        image_url = current_images[image_index]
        
        # Delete from Supabase storage
        await file_service.delete_lab_analysis_image(image_url)
        
        # Remove from array
        current_images.pop(image_index)
        
        # Update inspection record
        inspection.lab_analysis_images = json.dumps(current_images)
        db.commit()
        db.refresh(inspection)
        
        return {
            "message": "Lab analysis image deleted successfully",
            "inspection_id": inspection_id,
            "remaining_images": len(current_images)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete lab analysis image: {str(e)}"
        ) 