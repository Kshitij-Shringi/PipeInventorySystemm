from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class PipeEntry(BaseModel):
    from_supplier: str = Field(..., description='Supplier name; stored as "from" in MongoDB')
    length: float
    width: float
    height: float
    quantity: int


class PipeEntryInDB(PipeEntry):
    id: str


class OrderRequirement(BaseModel):
    length: float
    width: float
    height: float
    quantity_needed: int


class OrderRequest(BaseModel):
    recipient: str
    requirements: list[OrderRequirement]


class RemainderDecision(BaseModel):
    pipe_id: str
    remainder_length: float
    width: float
    height: float
    from_supplier: str
    keep: bool


class ExecuteOrderRequest(BaseModel):
    recipient: str
    fulfillments: list[dict]
    remainder_decisions: list[RemainderDecision]
    analysis: list[dict] = Field(default=[], description="Analysis results for visualization")


class Tenant(BaseModel):
    name: str
    slug: str = Field(..., description="URL-friendly identifier for the tenant")
    created_at: datetime | None = None
    plan: str | None = Field(default=None, description="Optional plan identifier")


class User(BaseModel):
    email: EmailStr
    full_name: str | None = None
    hashed_password: str
    tenant_id: str
    role: str = Field(default="owner", description='Role within the tenant, e.g. "owner" or "member"')
    is_active: bool = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str | None = None
    tenant_id: str | None = None
