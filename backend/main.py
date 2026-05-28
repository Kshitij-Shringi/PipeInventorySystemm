from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import get_legacy_single_tenant_database, get_control_database, INVENTORY_COLLECTION
from routes import inventory, orders
from routes import auth as auth_routes
from routes import admin as admin_routes
from routes import products as products_routes
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

_DEFAULT_CORS_ORIGINS = ",".join(
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://pinventory.pedalsupclients.xyz",
    ]
)
# Empty CORS_ORIGINS in hosting env overrides os.getenv default — treat as unset.
_cors_origins_env = (os.getenv("CORS_ORIGINS") or "").strip() or _DEFAULT_CORS_ORIGINS
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in _cors_origins_env.split(",")
    if origin.strip()
]

# Optional regex, e.g. all HTTPS pedalsup client subdomains (frontend on another host).
_cors_origin_regex = (os.getenv("CORS_ORIGIN_REGEX") or "").strip() or None
if _cors_origin_regex is None and os.getenv("CORS_PEDALSUP_SUBDOMAINS", "true").lower() in (
    "1",
    "true",
    "yes",
):
    _cors_origin_regex = r"https://[\w-]+\.pedalsupclients\.xyz"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("[CORS] Configuration loaded on startup")
print(f"[CORS] CORS_ORIGINS effective: {_cors_origins_env!r}")
print(f"[CORS] Allowed origins ({len(allowed_origins)}): {allowed_origins}")
print(f"[CORS] allow_origin_regex: {_cors_origin_regex!r}")
print("[CORS] allow_credentials=True | allow_methods=* | allow_headers=*")

app.include_router(auth_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(products_routes.router, prefix="/api")
