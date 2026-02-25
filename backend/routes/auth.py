from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, Form, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from auth import create_access_token, get_current_user, get_password_hash, verify_password
from database import TENANTS_COLLECTION, USERS_COLLECTION, get_database
from models import Token, User


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register-tenant", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_tenant_owner(
    email: str = Form(...),
    password: str = Form(...),
    tenant_name: str = Form(...),
):
    """
    Create a new tenant and its initial owner user, returning an access token.
    """
    if not email or not password or not tenant_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email, password, and tenant_name are required")

    db = get_database()
    tenants_coll = db[TENANTS_COLLECTION]
    users_coll = db[USERS_COLLECTION]

    existing_user = await users_coll.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with this email already exists")

    slug = tenant_name.lower().replace(" ", "-")
    existing_tenant = await tenants_coll.find_one({"slug": slug})
    if existing_tenant:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant with this name already exists")

    tenant_doc = {
        "name": tenant_name,
        "slug": slug,
        "created_at": datetime.now(timezone.utc),
        "plan": None,
    }
    tenant_result = await tenants_coll.insert_one(tenant_doc)
    tenant_id = str(tenant_result.inserted_id)

    user_doc = {
        "email": email,
        "full_name": None,
        "hashed_password": get_password_hash(password),
        "tenant_id": tenant_id,
        "role": "owner",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    user_result = await users_coll.insert_one(user_doc)
    user_id = str(user_result.inserted_id)

    access_token = create_access_token(subject=user_id, tenant_id=tenant_id)
    return Token(access_token=access_token, token_type="bearer")


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Standard OAuth2 password grant compatible login.
    """
    db = get_database()
    users_coll = db[USERS_COLLECTION]

    user_doc = await users_coll.find_one({"email": form_data.username})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")
    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    if not verify_password(form_data.password, user_doc["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")

    tenant_id = user_doc["tenant_id"]
    access_token = create_access_token(subject=str(user_doc["_id"]), tenant_id=tenant_id)
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me")
async def read_current_user(current_user: User = Depends(get_current_user)):
    """
    Return the current authenticated user's basic information.
    """
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "tenant_id": current_user.tenant_id,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }

