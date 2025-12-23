from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings

security = HTTPBearer()

def get_current_user_id(
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.JWT_SECRET,
            algorithms=["HS256"],
        )
        return payload["sub"]
    except JWTError:
        raise HTTPException(401, "Invalid token")
