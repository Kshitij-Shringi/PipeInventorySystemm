from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from pydantic import BaseModel

from database import get_tenant_database
from security import get_current_active_user

router = APIRouter(prefix="/products", tags=["products"])

PRODUCTS_COLLECTION = "products"


class ProductCreate(BaseModel):
    name: str
    width: float
    height: float
    length: float


def _doc_to_item(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("")
async def list_products(current_user: dict = Depends(get_current_active_user)):
    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[PRODUCTS_COLLECTION]
    items = []
    async for doc in coll.find({}).sort("name", 1):
        items.append(_doc_to_item(doc))
    return items


@router.post("")
async def create_product(payload: ProductCreate, current_user: dict = Depends(get_current_active_user)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Product name is required")
    if payload.width <= 0 or payload.height <= 0 or payload.length <= 0:
        raise HTTPException(status_code=400, detail="Width, height and length must be positive")

    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[PRODUCTS_COLLECTION]

    existing = await coll.find_one({"name": {"$regex": f"^{payload.name.strip()}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="A product with this name already exists")

    doc = {
        "name": payload.name.strip(),
        "width": payload.width,
        "height": payload.height,
        "length": payload.length,
    }
    result = await coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_item(doc)


@router.put("/{id}")
async def update_product(id: str, payload: ProductCreate, current_user: dict = Depends(get_current_active_user)):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")

    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Product name is required")
    if payload.width <= 0 or payload.height <= 0 or payload.length <= 0:
        raise HTTPException(status_code=400, detail="Width, height and length must be positive")

    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[PRODUCTS_COLLECTION]

    duplicate = await coll.find_one({
        "name": {"$regex": f"^{payload.name.strip()}$", "$options": "i"},
        "_id": {"$ne": oid},
    })
    if duplicate:
        raise HTTPException(status_code=400, detail="A product with this name already exists")

    result = await coll.update_one(
        {"_id": oid},
        {"$set": {"name": payload.name.strip(), "width": payload.width, "height": payload.height, "length": payload.length}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    updated = await coll.find_one({"_id": oid})
    return _doc_to_item(updated)


@router.delete("/{id}")
async def delete_product(id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")

    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[PRODUCTS_COLLECTION]
    result = await coll.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}
