import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from auth_models import TenantRequestApprove, TenantCreate, TenantUserCreate, utc_now
from database import (
    get_control_database,
    get_tenant_database,
    INVENTORY_COLLECTION,
    ORDERS_COLLECTION,
)
from security import get_current_superadmin, hash_password


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_superadmin)])


def _slugify_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "tenant"


def _tenant_db_name(tenant_id: str, tenant_name: str) -> str:
    slug = _slugify_name(tenant_name)
    short_id = tenant_id[:6]
    return f"pipe_inventory_{slug}_{short_id}"


@router.get("/tenants")
async def list_tenants():
    control_db = get_control_database()
    cursor = control_db["tenants"].find({})
    tenants = []
    async for doc in cursor:
        tenants.append(
            {
                "id": str(doc["_id"]),
                "name": doc.get("name"),
                "status": doc.get("status", "active"),
                "logo_url": doc.get("logo_url"),
                "created_at": doc.get("created_at"),
            }
        )
    return {"items": tenants}


@router.post("/tenants")
async def create_tenant(payload: TenantCreate):
    """
    Superadmin: create a tenant directly with initial admin user.

    This is similar to approving a tenant request, but without going through
    the registration queue first.
    """
    control_db = get_control_database()

    existing = await control_db["users"].find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    tenant_name = payload.tenant_name.strip()
    tenant_doc = {
        "name": tenant_name,
        "status": "active",
        "created_at": utc_now(),
    }
    result = await control_db["tenants"].insert_one(tenant_doc)
    tenant_id = str(result.inserted_id)
    tenant_db_name = _tenant_db_name(tenant_id, tenant_name)

    await control_db["tenants"].update_one(
        {"_id": result.inserted_id},
        {"$set": {"db_name": tenant_db_name}},
    )

    password_hash = hash_password(payload.password)
    user_doc = {
        "email": payload.email,
        "password_hash": password_hash,
        "tenant_id": tenant_id,
        "role": "tenant_admin",
        "created_at": utc_now(),
    }
    await control_db["users"].insert_one(user_doc)

    tenant_db = get_tenant_database(tenant_db_name)
    await tenant_db.create_collection("inventory")
    await tenant_db.create_collection("orders")
    await tenant_db.create_collection("stock_activity")

    return {
        "id": tenant_id,
        "name": tenant_name,
        "status": "active",
        "created_at": tenant_doc["created_at"],
    }


@router.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str):
    control_db = get_control_database()
    try:
        oid = ObjectId(tenant_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tenant id")
    doc = await control_db["tenants"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "status": doc.get("status", "active"),
        "logo_url": doc.get("logo_url"),
    }


@router.put("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, body: dict):
    control_db = get_control_database()
    try:
        oid = ObjectId(tenant_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tenant id")

    updates: dict = {}
    if "name" in body and isinstance(body["name"], str) and body["name"].strip():
        updates["name"] = body["name"].strip()
    if "status" in body and body["status"] in {"active", "suspended"}:
        updates["status"] = body["status"]
    if "logo_url" in body:
        updates["logo_url"] = body["logo_url"] or None

    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid fields to update")

    result = await control_db["tenants"].update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    doc = await control_db["tenants"].find_one({"_id": oid})
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "status": doc.get("status", "active"),
        "logo_url": doc.get("logo_url"),
        "created_at": doc.get("created_at"),
    }


@router.post("/tenants/{tenant_id}/status")
async def update_tenant_status(tenant_id: str, body: dict):
    status_value = body.get("status")
    if status_value not in {"active", "suspended"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    control_db = get_control_database()
    try:
        oid = ObjectId(tenant_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tenant id")
    result = await control_db["tenants"].update_one({"_id": oid}, {"$set": {"status": status_value}})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return {"ok": True}


@router.get("/tenants/{tenant_id}/stats")
async def tenant_stats(tenant_id: str):
    control_db = get_control_database()
    try:
        oid = ObjectId(tenant_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tenant id")

    tenant = await control_db["tenants"].find_one({"_id": oid})
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    db_name = tenant.get("db_name")
    if not db_name:
        return {
            "id": tenant_id,
            "name": tenant.get("name"),
            "status": tenant.get("status", "active"),
            "logo_url": tenant.get("logo_url"),
            "stats": {},
        }

    db = get_tenant_database(db_name)

    # Aggregate high-level counts
    inv_coll = db[INVENTORY_COLLECTION]
    orders_coll = db[ORDERS_COLLECTION]
    stock_activity_coll = db["stock_activity"]

    inv_count = await inv_coll.count_documents({})
    orders_count = await orders_coll.count_documents({})
    activity_count = await stock_activity_coll.count_documents({})
    user_count = await control_db["users"].count_documents({"tenant_id": tenant_id})

    # Sample a few users for overview
    users: list[dict] = []
    users_cursor = (
        control_db["users"]
        .find({"tenant_id": tenant_id})
        .sort("created_at", -1)
        .limit(10)
    )
    async for doc in users_cursor:
        users.append(
            {
                "id": str(doc.get("_id")),
                "email": doc.get("email", ""),
                "role": doc.get("role", "user"),
                "created_at": doc.get("created_at"),
            }
        )

    # Inventory snapshot – group by dimensions, first 10 rows.
    inv_group_pipeline = [
        {
            "$group": {
                "_id": {"length": "$length", "width": "$width", "height": "$height"},
                "quantity": {"$sum": "$quantity"},
                "firstSupplier": {"$first": "$from"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "length": "$_id.length",
                "width": "$_id.width",
                "height": "$_id.height",
                "quantity": "$quantity",
                "from_supplier": "$firstSupplier",
            }
        },
        {"$sort": {"length": -1}},
    ]
    # Run full aggregation to get total groups count + first page
    all_inv_groups: list[dict] = []
    async for doc in inv_coll.aggregate(inv_group_pipeline):
        all_inv_groups.append(doc)
    inventory_groups_total = len(all_inv_groups)
    inventory_sample = all_inv_groups[:10]

    # Recent orders snapshot – first 10, newest first.
    orders_total = await orders_coll.count_documents({})
    recent_orders: list[dict] = []
    orders_cursor = (
        orders_coll.find({})
        .sort("created_at", -1)
        .limit(10)
    )
    async for doc in orders_cursor:
        recent_orders.append(
            {
                "id": str(doc.get("_id")),
                "recipient": doc.get("recipient"),
                "summary": doc.get("summary", {}),
                "created_at": doc.get("created_at"),
            }
        )

    return {
        "id": tenant_id,
        "name": tenant.get("name"),
        "status": tenant.get("status", "active"),
        "logo_url": tenant.get("logo_url"),
        "created_at": tenant.get("created_at"),
        "stats": {
            "inventory_count": inv_count,
            "orders_count": orders_count,
            "stock_activity_count": activity_count,
            "user_count": user_count,
        },
        "users": users,
        "inventory_sample": inventory_sample,
        "inventory_groups_total": inventory_groups_total,
        "recent_orders": recent_orders,
        "orders_total": orders_total,
    }


@router.get("/tenants/{tenant_id}/inventory")
async def get_tenant_inventory(tenant_id: str, skip: int = 0, limit: int = 10):
    """Paginated grouped inventory for a tenant (superadmin view)."""
    control_db = get_control_database()
    try:
        oid = ObjectId(tenant_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tenant id")
    tenant = await control_db["tenants"].find_one({"_id": oid})
    if not tenant or not tenant.get("db_name"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found or has no database")

    db = get_tenant_database(tenant["db_name"])
    pipeline = [
        {
            "$group": {
                "_id": {"length": "$length", "width": "$width", "height": "$height"},
                "quantity": {"$sum": "$quantity"},
                "firstSupplier": {"$first": "$from"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "length": "$_id.length",
                "width": "$_id.width",
                "height": "$_id.height",
                "quantity": "$quantity",
                "from_supplier": "$firstSupplier",
            }
        },
        {"$sort": {"length": -1}},
    ]
    all_rows: list[dict] = []
    async for doc in db[INVENTORY_COLLECTION].aggregate(pipeline):
        all_rows.append(doc)
    return {"items": all_rows[skip: skip + limit], "total": len(all_rows)}


@router.get("/tenants/{tenant_id}/orders")
async def get_tenant_orders(tenant_id: str, skip: int = 0, limit: int = 10):
    """Paginated orders for a tenant (superadmin view)."""
    control_db = get_control_database()
    try:
        oid = ObjectId(tenant_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tenant id")
    tenant = await control_db["tenants"].find_one({"_id": oid})
    if not tenant or not tenant.get("db_name"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found or has no database")

    db = get_tenant_database(tenant["db_name"])
    orders_coll = db[ORDERS_COLLECTION]
    total = await orders_coll.count_documents({})
    cursor = orders_coll.find({}).sort("created_at", -1).skip(skip).limit(limit)
    items: list[dict] = []
    async for doc in cursor:
        items.append(
            {
                "id": str(doc.get("_id")),
                "recipient": doc.get("recipient"),
                "summary": doc.get("summary", {}),
                "created_at": doc.get("created_at"),
            }
        )
    return {"items": items, "total": total}


@router.patch("/tenants/{tenant_id}/users/{user_id}/reset-password")
async def admin_reset_user_password(tenant_id: str, user_id: str, body: dict):
    """Superadmin: reset a specific user's password within a tenant."""
    new_password = (body.get("new_password") or "").strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters")

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")

    control_db = get_control_database()
    user_doc = await control_db["users"].find_one({"_id": oid, "tenant_id": tenant_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    from datetime import datetime, timezone
    await control_db["users"].update_one(
        {"_id": oid},
        {"$set": {"password_hash": hash_password(new_password), "password_changed_at": datetime.now(timezone.utc)}},
    )
    return {"ok": True}


@router.post("/tenants/{tenant_id}/users")
async def create_tenant_user(tenant_id: str, payload: TenantUserCreate):
    """Superadmin: create a user directly under a tenant."""
    control_db = get_control_database()
    # Ensure tenant exists
    try:
        oid = ObjectId(tenant_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tenant id")
    tenant = await control_db["tenants"].find_one({"_id": oid})
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Prevent duplicate email globally
    existing = await control_db["users"].find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    password_hash = hash_password(payload.password)
    doc = {
        "email": payload.email,
        "password_hash": password_hash,
        "tenant_id": tenant_id,
        "role": payload.role,
        "created_at": utc_now(),
    }
    result = await control_db["users"].insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "email": payload.email,
        "role": payload.role,
        "tenant_id": tenant_id,
    }


# ---------- Tenant registration requests (admin approves before access) ----------


@router.get("/tenant-requests")
async def list_tenant_requests(status_filter: Optional[str] = "pending"):
    """List tenant requests. Default: only pending. Use status_filter=all for all."""
    control_db = get_control_database()
    query = {} if status_filter == "all" else {"status": "pending"}
    cursor = control_db["tenant_requests"].find(query).sort("created_at", -1)
    items = []
    async for doc in cursor:
        items.append({
            "id": str(doc["_id"]),
            "email": doc.get("email", ""),
            "tenant_name": doc.get("tenant_name"),
            "status": doc.get("status", "pending"),
            "created_at": doc.get("created_at"),
        })
    return {"items": items}


@router.post("/tenant-requests/{request_id}/approve")
async def approve_tenant_request(request_id: str, payload: TenantRequestApprove):
    """Create the tenant and first user from a pending request; mark request approved."""
    control_db = get_control_database()
    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request id")

    req = await control_db["tenant_requests"].find_one({"_id": oid})
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.get("status") != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is not pending (already approved or rejected)",
        )

    email = req.get("email", "").strip()
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request has no email")

    existing = await control_db["users"].find_one({"email": email})
    if existing:
        await control_db["tenant_requests"].update_one(
            {"_id": oid},
            {"$set": {"status": "rejected", "resolved_at": utc_now()}},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered. Reject the request instead.",
        )

    tenant_name = (payload.tenant_name or "").strip() or (req.get("tenant_name") or "New Tenant").strip()
    if not tenant_name:
        tenant_name = "New Tenant"

    tenant_doc = {
        "name": tenant_name,
        "status": "active",
        "created_at": utc_now(),
    }
    result = await control_db["tenants"].insert_one(tenant_doc)
    tenant_id = str(result.inserted_id)
    tenant_db_name = _tenant_db_name(tenant_id, tenant_name)
    await control_db["tenants"].update_one(
        {"_id": result.inserted_id},
        {"$set": {"db_name": tenant_db_name}},
    )

    password_hash = hash_password(payload.password)
    user_doc = {
        "email": email,
        "password_hash": password_hash,
        "tenant_id": tenant_id,
        "role": "tenant_admin",
        "created_at": utc_now(),
    }
    await control_db["users"].insert_one(user_doc)

    tenant_db = get_tenant_database(tenant_db_name)
    await tenant_db.create_collection("inventory")
    await tenant_db.create_collection("orders")
    await tenant_db.create_collection("stock_activity")

    await control_db["tenant_requests"].update_one(
        {"_id": oid},
        {"$set": {"status": "approved", "resolved_at": utc_now(), "tenant_id": tenant_id}},
    )

    return {
        "ok": True,
        "tenant_id": tenant_id,
        "message": "Tenant created. User can sign in with their email and the password you set.",
    }


@router.post("/tenant-requests/{request_id}/reject")
async def reject_tenant_request(request_id: str):
    """Mark a pending tenant request as rejected."""
    control_db = get_control_database()
    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request id")

    result = await control_db["tenant_requests"].update_one(
        {"_id": oid, "status": "pending"},
        {"$set": {"status": "rejected", "resolved_at": utc_now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found or not pending",
        )
    return {"ok": True}

