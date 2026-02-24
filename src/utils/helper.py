import hashlib
import secrets

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