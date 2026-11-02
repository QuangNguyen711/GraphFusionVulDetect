from typing import Optional
from pydantic import BaseModel, Field
from .entity import UserProfile


class AuthRequest(BaseModel):
    username: Optional[str] = Field(default=None, description="The user's login name")
    password: Optional[str] = Field(default=None, description="The user's login password")

class AuthResponse(BaseModel):
    status: Optional[str] = Field(default=None, description="The authentication status")
    message: Optional[str] = Field(default=None, description="Additional information about the authentication result")
    user: Optional[UserProfile] = Field(default=None, description="The authenticated user's profile information")

class ErrorResponse(BaseModel):
    error_code: Optional[int] = Field(default=None, description="The error code")
    error_message: Optional[str] = Field(default=None, description="The error message")


