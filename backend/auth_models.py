from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class TenantCreate(BaseModel):
    tenant_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class TenantRequestCreate(BaseModel):
    """Submit a request for a new tenant; admin approves before access is granted."""
    email: EmailStr
    tenant_name: Optional[str] = Field(None, max_length=200)


class TenantRequestApprove(BaseModel):
    """Admin provides tenant name and initial password when approving a request."""
    tenant_name: str = Field(..., min_length=1, max_length=200)
    password: str = Field(..., min_length=6, max_length=128)


class TenantInDB(BaseModel):
    id: str
    name: str
    slug: str
    db_name: str
    created_at: datetime
    status: str = "active"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    tenant_id: Optional[str] = None
    role: str = "user"


class TenantUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = "user"


class UserInDB(BaseModel):
    id: str
    email: EmailStr
    tenant_id: Optional[str] = None
    role: str
    password_hash: str
    created_at: datetime


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    sub: Optional[str] = None
    tenant_id: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    exp: Optional[int] = None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def access_token_expiry(minutes: int) -> datetime:
    return utc_now() + timedelta(minutes=minutes)

