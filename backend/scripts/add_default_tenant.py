import asyncio
import os
from datetime import datetime, timezone

from bson import ObjectId

from database import (
    INVENTORY_COLLECTION,
    ORDERS_COLLECTION,
    STOCK_ACTIVITY_COLLECTION,
    TENANTS_COLLECTION,
    USERS_COLLECTION,
    get_database,
)
from auth import get_password_hash


DEFAULT_TENANT_NAME = os.getenv("DEFAULT_TENANT_NAME", "Default Tenant")
DEFAULT_TENANT_SLUG = os.getenv("DEFAULT_TENANT_SLUG", "default-tenant")
DEFAULT_OWNER_EMAIL = os.getenv("DEFAULT_OWNER_EMAIL", "owner@example.com")
DEFAULT_OWNER_PASSWORD = os.getenv("DEFAULT_OWNER_PASSWORD", "changeme")


async def main() -> None:
    db = get_database()

    tenants_coll = db[TENANTS_COLLECTION]
    users_coll = db[USERS_COLLECTION]

    # Ensure default tenant exists
    tenant = await tenants_coll.find_one({"slug": DEFAULT_TENANT_SLUG})
    if tenant:
        tenant_id = tenant["_id"]
    else:
        tenant_result = await tenants_coll.insert_one(
            {
                "name": DEFAULT_TENANT_NAME,
                "slug": DEFAULT_TENANT_SLUG,
                "created_at": datetime.now(timezone.utc),
                "plan": None,
            }
        )
        tenant_id = tenant_result.inserted_id

    # Ensure a default owner user exists
    owner = await users_coll.find_one({"email": DEFAULT_OWNER_EMAIL})
    if not owner:
        await users_coll.insert_one(
            {
                "email": DEFAULT_OWNER_EMAIL,
                "full_name": None,
                "hashed_password": get_password_hash(DEFAULT_OWNER_PASSWORD),
                "tenant_id": str(tenant_id),
                "role": "owner",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
            }
        )

    # Backfill tenant_id on existing data collections where missing
    tenant_id_str = str(tenant_id)

    async def backfill_collection(name: str):
        coll = db[name]
        # Only update documents that do not already have a tenant_id
        await coll.update_many({"tenant_id": {"$exists": False}}, {"$set": {"tenant_id": tenant_id_str}})

    await backfill_collection(INVENTORY_COLLECTION)
    await backfill_collection(ORDERS_COLLECTION)
    await backfill_collection(STOCK_ACTIVITY_COLLECTION)


if __name__ == "__main__":
    asyncio.run(main())

