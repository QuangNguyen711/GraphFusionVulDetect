from fastapi import APIRouter
from .v1.analyze import router as analyze_router

def create_router():
    """Create and configure the main API router"""
    router = APIRouter(prefix="/api/v1", tags=["vulnerability-analysis"])
    
    # Include all v1 endpoints
    router.include_router(analyze_router)
    
    return router