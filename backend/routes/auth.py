from datetime import timedelta
from typing import Annotated
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from auth_models import TenantCreate, TenantUserCreate, Token, UserPublic, utc_now
from database import get_control_database, get_tenant_database
from security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_current_active_user,
    hash_password,
    verify_password,
)


router = APIRouter(prefix="/auth", tags=["auth"])


def _slugify_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "tenant"


def _tenant_db_name(tenant_id: str, tenant_name: str) -> str:
    """
    Generate a readable, mostly-stable database name for a tenant.

    Example: "pipe_inventory_meet_6d3a1f"
    """
    slug = _slugify_name(tenant_name)
    short_id = tenant_id[:6]
    return f"pipe_inventory_{slug}_{short_id}"


@router.post("/register-tenant", response_model=Token)
async def register_tenant(payload: TenantCreate):
    """
    Register a new tenant and its first admin user, then return an access token.
    """
    control_db = get_control_database()

    existing = await control_db["users"].find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    tenant_doc = {
        "name": payload.tenant_name,
        "status": "active",
        "created_at": utc_now(),
    }
    result = await control_db["tenants"].insert_one(tenant_doc)
    tenant_id = str(result.inserted_id)
    tenant_db_name = _tenant_db_name(tenant_id, payload.tenant_name)

    await control_db["tenants"].update_one(
        {"_id": result.inserted_id},
        {"$set": {"db_name": tenant_db_name}},
    )

    password_hash = hash_password(payload.password)
    user_doc = {
        "email": str(payload.email),
        "password_hash": password_hash,
        "tenant_id": tenant_id,
        "role": "tenant_admin",
    }
    user_result = await control_db["users"].insert_one(user_doc)
    user_id = str(user_result.inserted_id)

    tenant_db = get_tenant_database(tenant_db_name)
    await tenant_db.create_collection("inventory")
    await tenant_db.create_collection("orders")
    await tenant_db.create_collection("stock_activity")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "role": "tenant_admin",
        "email": str(payload.email),
    }
    access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """
    Login for tenant users (including tenant admins).
    """
    control_db = get_control_database()
    user = await control_db["users"].find_one({"email": form_data.username})
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")

    if not verify_password(form_data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")

    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not associated with a tenant")

    tenant = await control_db["tenants"].find_one({"_id": ObjectId(tenant_id)})
    if not tenant or tenant.get("status") != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant is not active")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": str(user["_id"]),
        "tenant_id": tenant_id,
        "role": user.get("role", "user"),
        "email": user.get("email"),
    }
    access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
    return Token(access_token=access_token)


@router.post("/admin-login", response_model=Token)
async def admin_login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """
    Global admin login (superadmin accounts, not tied to any tenant).
    """
    control_db = get_control_database()
    user = await control_db["users"].find_one({"email": form_data.username, "role": "superadmin"})
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")

    if not verify_password(form_data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": str(user["_id"]),
        "role": "superadmin",
        "email": user.get("email"),
    }
    access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
    return Token(access_token=access_token)


@router.post("/users", response_model=UserPublic)
async def create_tenant_user(
    payload: TenantUserCreate,
    current_user: dict = Depends(get_current_active_user),
):
    """
    Create an additional user within the current tenant.

    Only tenant_admin (or future superadmin) should be allowed to call this.
    """
    role = current_user.get("role")
    if role not in {"tenant_admin", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only tenant admins can create users")

    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current user is not scoped to a tenant")

    control_db = get_control_database()

    existing = await control_db["users"].find_one({"email": str(payload.email)})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    password_hash = hash_password(payload.password)
    user_doc = {
        "email": str(payload.email),
        "password_hash": password_hash,
        "tenant_id": tenant_id,
        "role": payload.role or "user",
    }
    result = await control_db["users"].insert_one(user_doc)
    return UserPublic(id=str(result.inserted_id), email=payload.email, role=user_doc["role"])


@router.get("/users", response_model=list[UserPublic])
async def list_tenant_users(current_user: dict = Depends(get_current_active_user)):
    """
    List users belonging to the current tenant.
    """
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current user is not scoped to a tenant")

    control_db = get_control_database()
    cursor = control_db["users"].find({"tenant_id": tenant_id})
    users: list[UserPublic] = []
    async for doc in cursor:
        users.append(
            UserPublic(
                id=str(doc["_id"]),
                email=doc.get("email", ""),
                role=doc.get("role", "user"),
            )
        )
    return users


@router.get("/me")
async def me(current_user: dict = Depends(get_current_active_user)):
    """
    Return current user and tenant info for the tenant-facing app.
    """
    control_db = get_control_database()
    tenant_id = current_user.get("tenant_id")
    tenant_doc = None
    if tenant_id:
        try:
            tenant_doc = await control_db["tenants"].find_one({"_id": ObjectId(tenant_id)})
        except Exception:
            tenant_doc = None

    return {
        "user": {
            "id": str(current_user.get("id")),
            "email": current_user.get("email"),
            "role": current_user.get("role"),
        },
        "tenant": {
            "id": tenant_id,
            "name": tenant_doc.get("name") if tenant_doc else None,
            "logo_url": tenant_doc.get("logo_url") if tenant_doc else None,
        }
        if tenant_id
        else None,
    }


@router.patch("/users/{user_id}", response_model=UserPublic)
async def update_tenant_user(
    user_id: str,
    body: dict,
    current_user: dict = Depends(get_current_active_user),
):
    """
    Update a user within the current tenant (currently only role).
    """
    role = current_user.get("role")
    if role not in {"tenant_admin", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only tenant admins can update users")

    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current user is not scoped to a tenant")

    new_role = body.get("role")
    if new_role not in {"user", "tenant_admin"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")

    control_db = get_control_database()
    user_doc = await control_db["users"].find_one({"_id": oid, "tenant_id": tenant_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Prevent demoting yourself from tenant_admin via this endpoint
    if str(user_doc["_id"]) == str(current_user.get("id")) and new_role != user_doc.get("role"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role")

    await control_db["users"].update_one({"_id": oid}, {"$set": {"role": new_role}})
    updated = await control_db["users"].find_one({"_id": oid})
    return UserPublic(id=str(updated["_id"]), email=updated.get("email", ""), role=updated.get("role", "user"))


@router.delete("/users/{user_id}")
async def delete_tenant_user(
    user_id: str,
    current_user: dict = Depends(get_current_active_user),
):
    """
    Delete a user within the current tenant.
    """
    role = current_user.get("role")
    if role not in {"tenant_admin", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only tenant admins can delete users")

    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current user is not scoped to a tenant")

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")

    control_db = get_control_database()
    user_doc = await control_db["users"].find_one({"_id": oid, "tenant_id": tenant_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Prevent deleting yourself
    if str(user_doc["_id"]) == str(current_user.get("id")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")

    await control_db["users"].delete_one({"_id": oid})
    return {"ok": True}

