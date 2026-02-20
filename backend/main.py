from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import get_database, INVENTORY_COLLECTION
from routes import inventory, orders


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = get_database()
    coll = db[INVENTORY_COLLECTION]
    n = await coll.count_documents({})
    if n == 0:
        await coll.insert_many([
            {"from": "Astral Pipes", "length": 120, "width": 40, "height": 40, "quantity": 20},
            {"from": "Astral Pipes", "length": 80, "width": 40, "height": 40, "quantity": 1},
            {"from": "Supplier X", "length": 60, "width": 40, "height": 40, "quantity": 5},
        ])
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
