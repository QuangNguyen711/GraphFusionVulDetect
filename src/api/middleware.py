from typing import Optional
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from .v1.authentication_router import get_current_user
from src.models.entity import UserInDB
from src.config.settings import settings

JWT_SECRET = settings.JWT_SECRET
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[UserInDB]:
    """Get current user if token is provided, otherwise return None"""
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        
        # Import here to avoid circular imports
        from .v1.authentication_router import get_user
        user = await get_user(username=username)
        return user
    except (jwt.PyJWTError, Exception):
        return None


# Dependency for protected routes
def require_auth():
    """Dependency that requires authentication"""
    return Depends(get_current_user)


# Dependency for optional auth
def optional_auth():
    """Dependency for optional authentication"""
    return Depends(get_current_user_optional)
