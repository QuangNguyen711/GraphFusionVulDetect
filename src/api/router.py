from fastapi import APIRouter
from .v1.analyze import router as analyze_router
from .v1.authentication import router as auth_router

def create_router():
    """Create and configure the main API router"""
    router = APIRouter(prefix="/api/v1", tags=["api"])
    
    # Include all v1 endpoints
    router.include_router(analyze_router)
    router.include_router(auth_router)
    
    return router