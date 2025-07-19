from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas import EmailRequest, EmailResponse
from app.services.email_service import email_service

router = APIRouter()

@router.post("/send", response_model=EmailResponse)
async def send_email(request: EmailRequest):
    """
    Send email using templates
    """
    try:
        response = await email_service.send_email(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        )

@router.post("/send-lab-received/{inspection_id}")
async def send_lab_received_email(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """
    Send lab received notification email
    """
    try:
        # Mock inspection data for demo
        inspection_data = {
            "email": "customer@example.com",
            "full_name": "John Doe",
            "inspection_number": inspection_id
        }
        
        response = await email_service.send_lab_received_email(inspection_data)
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send lab received email: {str(e)}"
        )

@router.post("/send-report-ready/{inspection_id}")
async def send_report_ready_email(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """
    Send report ready notification email
    """
    try:
        # Mock inspection data for demo
        inspection_data = {
            "email": "customer@example.com",
            "full_name": "John Doe",
            "inspection_number": inspection_id
        }
        
        response = await email_service.send_report_ready_email(inspection_data)
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send report ready email: {str(e)}"
        )

@router.post("/send-review-request/{inspection_id}")
async def send_review_request_email(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """
    Send review request email
    """
    try:
        # Mock inspection data for demo
        inspection_data = {
            "email": "customer@example.com",
            "full_name": "John Doe",
            "inspection_number": inspection_id
        }
        
        response = await email_service.send_review_request_email(inspection_data)
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send review request email: {str(e)}"
        ) 