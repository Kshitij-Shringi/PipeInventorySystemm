from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import TENANTS_COLLECTION, USERS_COLLECTION, get_database
from models import TokenPayload, User


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def _get_jwt_settings() -> tuple[str, str, int]:
    import os

    secret_key = os.getenv("JWT_SECRET_KEY")
    if not secret_key:
        raise RuntimeError("JWT_SECRET_KEY environment variable is not set")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    return secret_key, algorithm, expire_minutes


def create_access_token(subject: str, tenant_id: str, expires_delta: Optional[timedelta] = None) -> str:
    secret_key, algorithm, default_expire_minutes = _get_jwt_settings()
    if expires_delta is None:
        expires_delta = timedelta(minutes=default_expire_minutes)
    to_encode = {
        "sub": subject,
        "tenant_id": tenant_id,
        "exp": datetime.now(timezone.utc) + expires_delta,
    }
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    secret_key, algorithm, _ = _get_jwt_settings()
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        token_data = TokenPayload(**payload)
    except (JWTError, ValueError):
        raise credentials_exception
    if not token_data.sub or not token_data.tenant_id:
        raise credentials_exception

    db = get_database()
    users_coll = db[USERS_COLLECTION]
    try:
        user_id = ObjectId(token_data.sub)
    except Exception:
        raise credentials_exception

    user_doc = await users_coll.find_one({"_id": user_id, "tenant_id": token_data.tenant_id})
    if not user_doc:
        raise credentials_exception

    user = User(
        email=user_doc["email"],
        full_name=user_doc.get("full_name"),
        hashed_password=user_doc["hashed_password"],
        tenant_id=user_doc["tenant_id"],
        role=user_doc.get("role", "owner"),
        is_active=user_doc.get("is_active", True),
    )
    return user


async def get_current_tenant(current_user: User = Depends(get_current_user)) -> dict:
    db = get_database()
    tenants_coll = db[TENANTS_COLLECTION]
    try:
        tenant_id = ObjectId(current_user.tenant_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    tenant = await tenants_coll.find_one({"_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant

