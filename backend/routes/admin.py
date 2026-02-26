from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from database import get_control_database, get_tenant_database
from security import get_current_superadmin


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_superadmin)])


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
    inv_count = await db["inventory"].count_documents({})
    orders_count = await db["orders"].count_documents({})
    activity_count = await db["stock_activity"].count_documents({})
    user_count = await control_db["users"].count_documents({"tenant_id": tenant_id})

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
    }

