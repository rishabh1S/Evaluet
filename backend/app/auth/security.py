from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt
from app.config import settings
import hashlib

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

def _normalize_password(password: str) -> str:
    """
    bcrypt max input = 72 bytes.
    We hash first to guarantee fixed-length input.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def hash_password(password: str) -> str:
    normalized = _normalize_password(password)
    return pwd_context.hash(normalized)

def verify_password(password: str, password_hash: str) -> bool:
    normalized = _normalize_password(password)
    return pwd_context.verify(normalized, password_hash)

def create_access_token(data: dict, expires_minutes: int = 30):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm="HS256",
    )
