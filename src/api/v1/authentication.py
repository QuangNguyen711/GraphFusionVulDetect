import os
import jwt
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import dotenv

from ..schema.entity import UserRegister, UserLogin, Token, UserProfile, UserInDB
from ...resource.database import get_users_collection
from ...utils.timezone import now_utc, now_vietnam, ensure_utc_for_db

# Load environment variables
dotenv.load_dotenv()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
JWT_SECRET = os.getenv("JWT_SECRET", "your-jwt-secret-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password hashing using simple PBKDF2 instead of bcrypt to avoid compatibility issues
def get_password_hash(password: str) -> str:
    """Hash a password using PBKDF2"""
    # Generate a random salt
    salt = secrets.token_hex(16)
    # Hash the password
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    # Return salt + hash
    return salt + pwd_hash.hex()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash"""
    try:
        # Extract salt (first 32 characters) and hash
        salt = hashed_password[:32]
        stored_hash = hashed_password[32:]
        # Hash the provided password with the same salt
        pwd_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
        # Compare hashes
        return pwd_hash.hex() == stored_hash
    except Exception:
        return False


# HTTP Bearer token
security = HTTPBearer()

router = APIRouter(prefix="/auth", tags=["authentication"])


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = now_vietnam() + expires_delta
    else:
        expire = now_vietnam() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


async def get_user(username: str) -> Optional[UserInDB]:
    """Get user from database by username or email"""
    users_collection = await get_users_collection()
    user_doc = await users_collection.find_one({
        "$or": [
            {"username": username},
            {"email": username}
        ]
    })
    if user_doc:
        user_doc["_id"] = str(user_doc["_id"])
        return UserInDB(**user_doc)
    return None


async def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    """Authenticate user with username/email and password"""
    user = await get_user(username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserInDB:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await get_user(username=username)
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=UserProfile)
async def register_user(user_data: UserRegister):
    """Register a new user"""
    users_collection = await get_users_collection()
    
    # Check if user already exists
    existing_user = await users_collection.find_one({
        "$or": [
            {"username": user_data.username},
            {"email": user_data.email}
        ]
    })
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": hashed_password,
        "is_active": True,
        "created_at": ensure_utc_for_db(now_vietnam()),
        "last_login": None
    }
    
    # Insert user into database
    result = await users_collection.insert_one(user_doc)
    user_doc["_id"] = str(result.inserted_id)
    
    # Return user profile (without password)
    return UserProfile(
        user_id=user_doc["_id"],
        username=user_doc["username"],
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        created_at=user_doc["created_at"]
    )


@router.post("/login", response_model=Token)
async def login_for_access_token(user_data: UserLogin):
    """Authenticate user and return access token"""
    users_collection = await get_users_collection()
    
    user = await authenticate_user(user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login timestamp
    await users_collection.update_one(
        {"_id": ObjectId(user.id)},
        {"$set": {"last_login": ensure_utc_for_db(now_vietnam())}}
    )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/me", response_model=UserProfile)
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    """Get current user profile"""
    return UserProfile(
        user_id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )


@router.post("/logout")
async def logout(current_user: UserInDB = Depends(get_current_user)):
    """Logout user (client should discard the token)"""
    return {"message": "Successfully logged out"}


@router.put("/profile", response_model=UserProfile)
async def update_profile(
    profile_data: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update user profile"""
    users_collection = await get_users_collection()
    
    # Remove sensitive fields that shouldn't be updated
    update_data = {k: v for k, v in profile_data.items() 
                   if k in ["full_name", "bio"] and v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update"
        )
    
    # Update user in database
    await users_collection.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )
    
    # Get updated user
    updated_user = await get_user(current_user.username)
    return UserProfile(
        user_id=updated_user.id,
        username=updated_user.username,
        email=updated_user.email,
        full_name=updated_user.full_name,
        created_at=updated_user.created_at,
        last_login=updated_user.last_login
    )