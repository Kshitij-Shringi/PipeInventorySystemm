from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from zoneinfo import ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from database import get_tenant_database, INVENTORY_COLLECTION, STOCK_ACTIVITY_COLLECTION
from security import get_current_active_user

router = APIRouter(prefix="/inventory", tags=["inventory"])
try:
    IST = ZoneInfo("Asia/Kolkata")
except ZoneInfoNotFoundError:
    # Fallback for Windows/Python environments missing tzdata package.
    IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def _doc_to_item(doc: dict) -> dict:
    """Convert MongoDB document to API response (id string, from_supplier)."""
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    if "from" in doc:
        doc["from_supplier"] = doc.pop("from")
    return doc


def _parse_date_start_ist(value: str):
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=IST)
        else:
            dt = dt.astimezone(IST)
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    except Exception:
        return None


def _parse_date_end_ist_exclusive(value: str):
    start = _parse_date_start_ist(value)
    if start is None:
        return None
    return start + timedelta(days=1)


def _to_ist_iso(value: datetime) -> str:
    # MongoDB often returns naive datetime values; treat them as UTC instants.
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(IST).isoformat(timespec="seconds")


def _now_ist_iso() -> str:
    return datetime.now(IST).isoformat(timespec="seconds")


@router.get("")
async def get_inventory(current_user: dict = Depends(get_current_active_user)):
    """
    Return inventory aggregated by (length, width, height) only - ignoring supplier.
    All pipes with same dimensions are combined into one row with total quantity.
    Uses one document id per group for delete (deleting removes one document from that group).
    """
    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[INVENTORY_COLLECTION]
    pipeline = [
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
async def add_stock(body: dict, current_user: dict = Depends(get_current_active_user)):
    """
    body: { from_supplier: str, pipes: [{ length, width, height, quantity }] }
    For each pipe: if matching from_supplier+L+W+H exists → $inc quantity, else insert.
    Also logs activity to stock_activity collection.
    """
    from_supplier = body.get("from_supplier")
    pipes = body.get("pipes", [])
    if not from_supplier or not pipes:
        raise HTTPException(status_code=400, detail="from_supplier and pipes required")

    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[INVENTORY_COLLECTION]
    activity_coll = db[STOCK_ACTIVITY_COLLECTION]

    total_added = 0
    pipes_added = []
    seen_dims = set()

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

        dim_key = (height, width, length)
        if dim_key in seen_dims:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Duplicate dimensions found for the same supplier in one request. "
                    "Use a different supplier if H x W x L is the same."
                ),
            )
        seen_dims.add(dim_key)

        await coll.update_one(
            {"from": from_supplier, "length": length, "width": width, "height": height},
            {"$inc": {"quantity": quantity}},
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
        "from_supplier": from_supplier,
        "pipes": pipes_added,
        "total_quantity": total_added,
        "created_at": _now_ist_iso(),
    })

    return {"ok": True, "message": "Stock added"}


@router.get("/activity")
async def get_stock_activity(
    start_date: str = None,
    end_date: str = None,
    page: int = 1,
    page_size: int = 10,
    current_user: dict = Depends(get_current_active_user),
):
    """
    Get stock addition activity with date filtering and pagination.
    start_date, end_date: ISO format date strings (YYYY-MM-DD)
    page: Page number (1-indexed)
    page_size: Items per page
    """
    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[STOCK_ACTIVITY_COLLECTION]
    
    # Build date filter
    date_filter = {}
    if start_date:
        start_dt = _parse_date_start_ist(start_date)
        if start_dt is not None:
            date_filter["$gte"] = start_dt.isoformat(timespec="seconds")
    if end_date:
        end_dt = _parse_date_end_ist_exclusive(end_date)
        if end_dt is not None:
            date_filter["$lt"] = end_dt.isoformat(timespec="seconds")
    
    query = {}
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
        if "created_at" in doc:
            if isinstance(doc["created_at"], datetime):
                doc["created_at"] = _to_ist_iso(doc["created_at"])
            else:
                doc["created_at"] = str(doc["created_at"])
        activities.append(doc)
    
    return {
        "items": activities,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


@router.delete("/{id}")
async def delete_inventory_item(id: str, current_user: dict = Depends(get_current_active_user)):
    """Delete a single underlying inventory document by id."""
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[INVENTORY_COLLECTION]
    result = await coll.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


@router.post("/bulk-delete")
async def bulk_delete_inventory_items(body: dict, current_user: dict = Depends(get_current_active_user)):
    """Delete many inventory documents in one request."""
    ids = body.get("ids")
    if not isinstance(ids, list) or len(ids) == 0:
        raise HTTPException(status_code=400, detail="ids must be a non-empty array")

    object_ids = []
    invalid_ids = []
    for raw_id in ids:
        try:
            object_ids.append(ObjectId(str(raw_id)))
        except Exception:
            invalid_ids.append(str(raw_id))

    if invalid_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid id(s): {', '.join(invalid_ids[:10])}",
        )

    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[INVENTORY_COLLECTION]
    result = await coll.delete_many({"_id": {"$in": object_ids}})
    return {"ok": True, "deleted_count": result.deleted_count}


@router.put("/{id}")
async def update_inventory_item(id: str, body: dict, current_user: dict = Depends(get_current_active_user)):
    """
    Update a single underlying inventory document by id.

    This lets the UI edit one aggregated row (length, width, height, quantity).
    """
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")

    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[INVENTORY_COLLECTION]
    doc = await coll.find_one({"_id": oid})
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
        {"_id": oid},
        {
            "$set": {
                "length": length,
                "width": width,
                "height": height,
                "quantity": quantity,
            }
        },
    )

    updated = await coll.find_one({"_id": oid})
    return _doc_to_item(updated)
