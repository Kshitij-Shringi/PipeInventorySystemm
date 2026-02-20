import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "pipe_inventory")

# Separate collections (tables)
INVENTORY_COLLECTION = "inventory"
ORDERS_COLLECTION = "orders"
STOCK_ACTIVITY_COLLECTION = "stock_activity"

client: AsyncIOMotorClient | None = None


def get_database():
    """Return the database and ensure client is connected."""
    global client
    if client is None:
        client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]
