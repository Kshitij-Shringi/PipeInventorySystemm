from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import get_legacy_single_tenant_database, get_control_database, INVENTORY_COLLECTION
from routes import inventory, orders
from routes import auth as auth_routes
from routes import admin as admin_routes
from security import hash_password


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed legacy inventory (for single-tenant/dev)
    db = get_legacy_single_tenant_database()
    coll = db[INVENTORY_COLLECTION]
    n = await coll.count_documents({})
    if n == 0:
        await coll.insert_many(
            [
                {"from": "Astral Pipes", "length": 120, "width": 40, "height": 40, "quantity": 20},
                {"from": "Astral Pipes", "length": 80, "width": 40, "height": 40, "quantity": 1},
                {"from": "Supplier X", "length": 60, "width": 40, "height": 40, "quantity": 5},
            ]
        )

    # Ensure a superadmin user exists, based on env configuration.
    control_db = get_control_database()
    super_email = os.getenv("SUPERADMIN_EMAIL")
    super_password = os.getenv("SUPERADMIN_PASSWORD")
    if super_email and super_password:
        existing = await control_db["users"].find_one({"email": super_email, "role": "superadmin"})
        if not existing:
            await control_db["users"].insert_one(
                {
                    "email": super_email,
                    "password_hash": hash_password(super_password),
                    "role": "superadmin",
                    "tenant_id": None,
                }
            )

    yield


app = FastAPI(lifespan=lifespan)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
