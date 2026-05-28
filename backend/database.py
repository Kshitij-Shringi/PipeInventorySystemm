import os
from typing import Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017/pipe_inventory")

# Control-plane DB (tenants, users, global config)
# We now derive the control DB name from the URI instead of a separate env var.
CONTROL_DB_NAME = "pipe_inventory_control"

# Collection names (used per-DB for tenant databases)
INVENTORY_COLLECTION = "inventory"
ORDERS_COLLECTION = "orders"
STOCK_ACTIVITY_COLLECTION = "stock_activity"


client: Optional[AsyncIOMotorClient] = None


def _get_client() -> AsyncIOMotorClient:
    """Return the shared Mongo client and ensure it is connected."""
    global client
    if client is None:
        client = AsyncIOMotorClient(MONGO_URL)
    return client


def get_control_database():
    """
    Return the control-plane database.

    This holds tenants, users, and global configuration and is shared across all tenants.
    """
    return _get_client()[CONTROL_DB_NAME]


def get_tenant_database(db_name: Optional[str] = None):
    """
    Return a tenant-specific database.

    If db_name is omitted, we fall back to the database specified in the MONGO_URI.
    This corresponds to the original single-tenant deployment. This is useful during
    migration and in development before full multi-tenant provisioning is wired up.
    """
    if db_name is not None:
        return _get_client()[db_name]
    # When no db_name is provided, use the default database from the URI.
    return _get_client().get_default_database()


def get_legacy_single_tenant_database():
    """
    Backwards-compatible helper returning the original single-tenant DB.

    Existing routes can temporarily keep using this until they are refactored
    to accept an injected tenant database.
    """
    return get_tenant_database()
