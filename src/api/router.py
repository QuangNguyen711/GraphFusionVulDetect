from fastapi import APIRouter
from .v1.analyze_router import router as analyze_router
from .v1.authentication_router import router as auth_router
from .v1.project_router import router as project_router
from .v1.refactorbot_router import router as refactorbot_router
from .v1.token_router import router as token_router

def create_router():
    """Create and configure the main API router"""
    router = APIRouter(prefix="/api/v1", tags=["api"])
    
    # Include all v1 endpoints
    router.include_router(analyze_router)
    router.include_router(auth_router)
    router.include_router(project_router)
    router.include_router(refactorbot_router)
    router.include_router(token_router)
    
    return router