from fastapi import APIRouter
from app.api.v1.endpoints import inspections, auth, llm, email

api_router = APIRouter()
 
# Include all endpoint routers
api_router.include_router(inspections.router, prefix="/inspections", tags=["inspections"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(llm.router, prefix="/llm", tags=["llm"])
api_router.include_router(email.router, prefix="/email", tags=["email"]) 