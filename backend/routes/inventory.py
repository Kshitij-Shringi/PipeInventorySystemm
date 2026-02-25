from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import get_database, INVENTORY_COLLECTION, STOCK_ACTIVITY_COLLECTION
from models import User

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _doc_to_item(doc: dict) -> dict:
    """Convert MongoDB document to API response (id string, from_supplier)."""
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    if "from" in doc:
        doc["from_supplier"] = doc.pop("from")
    # Do not expose tenant_id in API responses
    doc.pop("tenant_id", None)
    return doc


@router.get("")
async def get_inventory(current_user: User = Depends(get_current_user)):
    """
    Return inventory aggregated by (length, width, height) only - ignoring supplier.
    All pipes with same dimensions are combined into one row with total quantity.
    Uses one document id per group for delete (deleting removes one document from that group).
    """
    db = get_database()
    coll = db[INVENTORY_COLLECTION]
    tenant_id = current_user.tenant_id
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {
            "$group": {
                "_id": {"length": "$length", "width": "$width", "height": "$height"},
                "quantity": {"$sum": "$quantity"},
                "firstId": {"$first": "$_id"},
                # Keep first supplier for reference (not shown in UI but useful for delete)
                "firstSupplier": {"$first": "$from"},
            }
        },
        {
            "$project": {
                "_id": "$firstId",
                "from": "$firstSupplier",
                "length": "$_id.length",
                "width": "$_id.width",
                "height": "$_id.height",
                "quantity": "$quantity",
            }
        },
    ]
    items = []
    async for doc in coll.aggregate(pipeline):
        items.append(_doc_to_item(doc))
    return items


@router.post("/add")
async def add_stock(body: dict, current_user: User = Depends(get_current_user)):
    """
    body: { from_supplier: str, pipes: [{ length, width, height, quantity }] }
    For each pipe: if matching from_supplier+L+W+H exists → $inc quantity, else insert.
    Also logs activity to stock_activity collection.
    """
    from_supplier = body.get("from_supplier")
    pipes = body.get("pipes", [])
    if not from_supplier or not pipes:
        raise HTTPException(status_code=400, detail="from_supplier and pipes required")

    db = get_database()
    coll = db[INVENTORY_COLLECTION]
    activity_coll = db[STOCK_ACTIVITY_COLLECTION]
    tenant_id = current_user.tenant_id

    total_added = 0
    pipes_added = []

    for p in pipes:
        try:
            length = float(p.get("length"))
            width = float(p.get("width"))
            height = float(p.get("height"))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Each pipe must have numeric length, width, height")
        quantity = p.get("quantity")
        if quantity is None:
            raise HTTPException(status_code=400, detail="Each pipe must have quantity")
        quantity = int(quantity)
        if quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be positive")

        await coll.update_one(
            {
                "tenant_id": tenant_id,
                "from": from_supplier,
                "length": length,
                "width": width,
                "height": height,
            },
            {
                "$inc": {"quantity": quantity},
                "$setOnInsert": {"tenant_id": tenant_id},
            },
            upsert=True,
        )
        total_added += quantity
        pipes_added.append({
            "length": length,
            "width": width,
            "height": height,
            "quantity": quantity,
        })

    # Log activity
    await activity_coll.insert_one({
        "tenant_id": tenant_id,
        "from_supplier": from_supplier,
        "pipes": pipes_added,
        "total_quantity": total_added,
        "created_at": datetime.now(timezone.utc),
    })

    return {"ok": True, "message": "Stock added"}


@router.get("/activity")
async def get_stock_activity(
    start_date: str = None,
    end_date: str = None,
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user),
):
    """
    Get stock addition activity with date filtering and pagination.
    start_date, end_date: ISO format date strings (YYYY-MM-DD)
    page: Page number (1-indexed)
    page_size: Items per page
    """
    from datetime import datetime, timedelta
    
    db = get_database()
    coll = db[STOCK_ACTIVITY_COLLECTION]
    tenant_id = current_user.tenant_id
    
    # Build date filter
    date_filter = {}
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            date_filter["$gte"] = start_dt
        except Exception:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            # Add one day to include the entire end date
            end_dt = end_dt + timedelta(days=1)
            if "$gte" in date_filter:
                date_filter["$lte"] = end_dt
            else:
                date_filter["$lte"] = end_dt
        except Exception:
            pass
    
    query = {"tenant_id": tenant_id}
    if date_filter:
        query["created_at"] = date_filter
    
    # Get total count
    total = await coll.count_documents(query)
    
    # Calculate skip
    skip = (page - 1) * page_size
    
    # Fetch paginated results
    cursor = coll.find(query).sort("created_at", -1).skip(skip).limit(page_size)
    activities = []
    async for doc in cursor:
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        if "created_at" in doc and hasattr(doc["created_at"], "isoformat"):
            doc["created_at"] = doc["created_at"].isoformat()
        activities.append(doc)
    
    return {
        "items": activities,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


@router.delete("/{id}")
async def delete_inventory_item(id: str, current_user: User = Depends(get_current_user)):
    """Delete a single underlying inventory document by id."""
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    db = get_database()
    coll = db[INVENTORY_COLLECTION]
    tenant_id = current_user.tenant_id
    result = await coll.delete_one({"_id": oid, "tenant_id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


@router.put("/{id}")
async def update_inventory_item(id: str, body: dict, current_user: User = Depends(get_current_user)):
    """
    Update a single underlying inventory document by id.

    This lets the UI edit one aggregated row (length, width, height, quantity).
    """
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")

    db = get_database()
    coll = db[INVENTORY_COLLECTION]
    tenant_id = current_user.tenant_id
    doc = await coll.find_one({"_id": oid, "tenant_id": tenant_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")

    try:
        length = float(body.get("length", doc.get("length")))
        width = float(body.get("width", doc.get("width")))
        height = float(body.get("height", doc.get("height")))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="length, width, height must be numeric")

    quantity = body.get("quantity", doc.get("quantity"))
    if quantity is None:
        raise HTTPException(status_code=400, detail="quantity required")
    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="quantity must be integer")
    if quantity < 0:
        raise HTTPException(status_code=400, detail="quantity must be non-negative")

    await coll.update_one(
        {"_id": oid, "tenant_id": tenant_id},
        {
            "$set": {
                "length": length,
                "width": width,
                "height": height,
                "quantity": quantity,
            }
        },
    )

    updated = await coll.find_one({"_id": oid, "tenant_id": tenant_id})
    return _doc_to_item(updated)
