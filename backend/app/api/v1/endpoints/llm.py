from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas import LLMRequest, LLMResponse
from app.services.llm_service import llm_service

router = APIRouter()

@router.post("/invoke", response_model=LLMResponse)
async def invoke_llm(request: LLMRequest):
    """
    Invoke LLM with custom prompt and context
    """
    try:
        response = await llm_service.invoke_llm(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM invocation failed: {str(e)}"
        )

@router.post("/generate-summary/{inspection_id}")
async def generate_inspection_summary(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered summary for an inspection
    """
    try:
        # Get inspection data (simplified for demo)
        inspection_data = {
            "full_name": "John Doe",
            "street_address": "123 Main St",
            "city": "Houston",
            "state": "TX",
            "square_footage": 2500,
            "has_visible_mold": True,
            "has_water_damage": False,
            "visible_mold_details": [{"location": "Bathroom ceiling"}],
            "water_damage_details": []
        }
        
        summary = await llm_service.generate_inspection_summary(inspection_data)
        return {"summary": summary}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )

@router.post("/generate-recommendations/{inspection_id}")
async def generate_recommendations(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered recommendations for an inspection
    """
    try:
        # Get inspection data (simplified for demo)
        inspection_data = {
            "has_visible_mold": True,
            "has_water_damage": False,
            "visible_mold_details": [{"location": "Bathroom ceiling"}],
            "water_damage_details": []
        }
        
        recommendations = await llm_service.generate_recommendations(inspection_data)
        return {"recommendations": recommendations}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}"
        )

@router.post("/generate-email-content")
async def generate_email_content(
    template: str,
    data: dict
):
    """
    Generate email content using LLM
    """
    try:
        content = await llm_service.generate_email_content(template, data)
        return {"content": content}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate email content: {str(e)}"
        ) 