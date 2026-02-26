import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from bson import ObjectId

from auth_models import TokenData
from database import get_control_database


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Use pbkdf2_sha256 to avoid bcrypt backend issues and password length limits.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = _now_utc() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenData(**payload)
        if token_data.sub is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Token stores user id as string; convert back to ObjectId for lookup.
    try:
        user_oid = ObjectId(token_data.sub)
    except Exception:
        raise credentials_exception

    db = get_control_database()
    user = await db["users"].find_one({"_id": user_oid})
    if not user:
        raise credentials_exception
    user["id"] = str(user.get("_id"))

    # Attach tenant DB name if this is a tenant-scoped user so routes don't
    # have to re-derive the database name from the raw tenant id.
    tenant_id = user.get("tenant_id")
    if tenant_id:
        try:
            tenant_oid = ObjectId(tenant_id)
            tenant = await db["tenants"].find_one({"_id": tenant_oid})
            if tenant and tenant.get("db_name"):
                user["tenant_db_name"] = tenant["db_name"]
        except Exception:
            # If anything goes wrong here, fall back to original behavior.
            pass
    return user


async def get_current_active_user(current_user: dict = Depends(get_current_user)) -> dict:
    # Placeholder for future flags like is_active; for now just return the user.
    return current_user


async def get_current_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    role = current_user.get("role")
    if role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return current_user

