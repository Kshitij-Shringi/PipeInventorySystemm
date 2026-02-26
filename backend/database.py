import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Control-plane DB (tenants, users, global config)
CONTROL_DB_NAME = os.getenv("MONGO_CONTROL_DB_NAME", "pipe_inventory_control")

# Default single-tenant DB name (used for legacy/migration and as base for tenant DBs)
DEFAULT_TENANT_DB_NAME = os.getenv("MONGO_DB_NAME", "pipe_inventory")

# Collection names (used per-DB for tenant databases)
INVENTORY_COLLECTION = "inventory"
ORDERS_COLLECTION = "orders"
STOCK_ACTIVITY_COLLECTION = "stock_activity"


client: AsyncIOMotorClient | None = None


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


def get_tenant_database(db_name: str | None = None):
    """
    Return a tenant-specific database.

    If db_name is omitted, we fall back to DEFAULT_TENANT_DB_NAME which corresponds
    to the original single-tenant deployment. This is useful during migration and
    in development before full multi-tenant provisioning is wired up.
    """
    name = db_name or DEFAULT_TENANT_DB_NAME
    return _get_client()[name]


def get_legacy_single_tenant_database():
    """
    Backwards-compatible helper returning the original single-tenant DB.

    Existing routes can temporarily keep using this until they are refactored
    to accept an injected tenant database.
    """
    return get_tenant_database(DEFAULT_TENANT_DB_NAME)
