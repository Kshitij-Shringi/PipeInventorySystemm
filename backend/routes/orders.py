from fastapi import APIRouter, HTTPException
from bson import ObjectId

from datetime import datetime, timezone

from database import get_database, INVENTORY_COLLECTION, ORDERS_COLLECTION
from models import OrderRequest, ExecuteOrderRequest

router = APIRouter(prefix="/orders", tags=["orders"])


def _doc_to_item(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    if "from" in doc:
        doc["from_supplier"] = doc.pop("from")
    return doc


def resolve_requirement(inventory: list[dict], req_length: float, req_width: float, req_height: float, req_qty: int):
    results = []
    remaining = req_qty
    local_inventory = {p["id"]: dict(p) for p in inventory}

    while remaining > 0:
        # Prioritize virtual remainder pipes (from earlier requirements) over real inventory
        # Check virtual pipes first, then real inventory
        virtual_exact = next(
            (
                p
                for p in local_inventory.values()
                if p["id"].startswith("virtual_")
                and p["length"] == req_length
                and p["width"] == req_width
                and p["height"] == req_height
                and p["quantity"] > 0
            ),
            None,
        )
        if virtual_exact:
            exact = virtual_exact
        else:
            exact = next(
                (
                    p
                    for p in local_inventory.values()
                    if not p["id"].startswith("virtual_")
                    and p["length"] == req_length
                    and p["width"] == req_width
                    and p["height"] == req_height
                    and p["quantity"] > 0
                ),
                None,
            )
        if exact:
            take = min(exact["quantity"], remaining)
            results.append(
                {
                    "pipe_id": exact["id"],
                    "from_supplier": exact["from_supplier"],
                    "source_length": exact["length"],
                    "width": exact["width"],
                    "height": exact["height"],
                    "quantity_used": take,
                    "cut_type": "exact",
                    "remainder": 0,
                }
            )
            local_inventory[exact["id"]]["quantity"] -= take
            remaining -= take
            continue

        candidates = sorted(
            [
                p
                for p in local_inventory.values()
                if p["length"] > req_length
                and p["width"] == req_width
                and p["height"] == req_height
                and p["quantity"] > 0
            ],
            key=lambda p: p["length"],
        )
        if candidates:
            source = candidates[0]
            # How many pieces of req_length fit in this one source pipe?
            fits_in_one_pipe = int(source["length"] // req_length)
            # Cut as many as needed (or as many as fit, whichever is less)
            cuts_this_pipe = min(fits_in_one_pipe, remaining)
            total_used_length = req_length * cuts_this_pipe
            remainder = round(source["length"] - total_used_length, 4)
            # Deduct 1 physical pipe from inventory
            local_inventory[source["id"]]["quantity"] -= 1
            # Fulfil that many units from this one pipe
            remaining -= cuts_this_pipe
            results.append(
                {
                    "pipe_id": source["id"],
                    "from_supplier": source["from_supplier"],
                    "source_length": source["length"],
                    "width": source["width"],
                    "height": source["height"],
                    "quantity_used": 1,
                    "cut_type": "cut",
                    "cuts_from_this_pipe": cuts_this_pipe,
                    "used_length": total_used_length,
                    "remainder": remainder,
                    "cut_length": req_length,
                }
            )
            continue

        results.append({"unfulfilled": remaining})
        break

    return results


@router.get("")
async def list_orders(
    start_date: str = None,
    end_date: str = None,
    page: int = 1,
    page_size: int = 10,
):
    """
    List orders with date filtering and pagination.
    start_date, end_date: ISO format date strings (YYYY-MM-DD)
    page: Page number (1-indexed)
    page_size: Items per page
    """
    from datetime import datetime
    
    db = get_database()
    coll = db[ORDERS_COLLECTION]
    
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
            from datetime import timedelta
            end_dt = end_dt + timedelta(days=1)
            if "$gte" in date_filter:
                date_filter["$lte"] = end_dt
            else:
                date_filter["$lte"] = end_dt
        except Exception:
            pass
    
    query = {}
    if date_filter:
        query["created_at"] = date_filter
    
    # Get total count
    total = await coll.count_documents(query)
    
    # Calculate skip
    skip = (page - 1) * page_size
    
    # Fetch paginated results
    cursor = coll.find(query).sort("created_at", -1).skip(skip).limit(page_size)
    orders = []
    async for doc in cursor:
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        if "created_at" in doc and hasattr(doc["created_at"], "isoformat"):
            doc["created_at"] = doc["created_at"].isoformat()
        orders.append(doc)
    
    return {
        "items": orders,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


@router.post("/analyse")
async def analyse_order(request: OrderRequest):
    """
    Run matching engine on requirements; does NOT modify DB.
    Uses remainders from earlier requirements to fulfill later ones.
    """
    db = get_database()
    coll = db[INVENTORY_COLLECTION]
    cursor = coll.find({})
    inventory = []
    async for doc in cursor:
        inventory.append(_doc_to_item(doc))

    # Track remainders generated during analysis (virtual inventory for this order)
    # Key: (length, width, height, from_supplier), Value: quantity
    remainder_inventory = {}
    # Map virtual pipe IDs to their remainder keys for tracking
    virtual_id_to_key = {}

    analysis = []
    for req in request.requirements:
        # Combine real inventory with virtual remainder inventory
        combined_inventory = list(inventory)
        virtual_id_counter = 1000000
        
        # Add remainders from previous requirements to combined inventory
        for (rem_length, rem_width, rem_height, rem_supplier), rem_qty in remainder_inventory.items():
            if rem_qty > 0:
                virtual_id = f"virtual_{virtual_id_counter}"
                virtual_id_counter += 1
                rem_key = (rem_length, rem_width, rem_height, rem_supplier)
                virtual_id_to_key[virtual_id] = rem_key
                
                combined_inventory.append({
                    "id": virtual_id,
                    "length": rem_length,
                    "width": rem_width,
                    "height": rem_height,
                    "quantity": rem_qty,
                    "from_supplier": rem_supplier,
                })

        # Resolve this requirement using combined inventory
        req_results = resolve_requirement(
            combined_inventory,
            req.length,
            req.width,
            req.height,
            req.quantity_needed,
        )
        
        analysis.append(
            {
                "requirement": {
                    "length": req.length,
                    "width": req.width,
                    "height": req.height,
                    "quantity_needed": req.quantity_needed,
                },
                "results": req_results,
            }
        )

        # Process results: deduct from inventory and collect remainders
        for r in req_results:
            if "pipe_id" in r and "quantity_used" in r:
                pid = r["pipe_id"]
                q = r["quantity_used"]
                
                # Check if it's a virtual remainder pipe
                if pid.startswith("virtual_") and pid in virtual_id_to_key:
                    # Deduct from remainder inventory using the mapped key
                    rem_key = virtual_id_to_key[pid]
                    if rem_key in remainder_inventory:
                        remainder_inventory[rem_key] = max(0, remainder_inventory[rem_key] - q)
                        if remainder_inventory[rem_key] == 0:
                            del remainder_inventory[rem_key]
                            del virtual_id_to_key[pid]
                else:
                    # Deduct from real inventory
                    for p in inventory:
                        if p["id"] == pid:
                            p["quantity"] -= q
                            break

                # If this was a cut operation, add remainder to virtual inventory
                if r.get("cut_type") == "cut" and r.get("remainder", 0) > 0:
                    rem_key = (
                        r["remainder"],
                        r["width"],
                        r["height"],
                        r.get("from_supplier", ""),
                    )
                    # Add remainder quantity (one remainder per physical pipe cut)
                    remainder_inventory[rem_key] = remainder_inventory.get(rem_key, 0) + 1

    return {"recipient": request.recipient, "analysis": analysis}


@router.post("/execute")
async def execute_order(request: ExecuteOrderRequest):
    """
    Deduct quantities from used pipes (delete if quantity hits 0).
    Insert remainder pipes where keep=True.
    Save order to orders collection. Return order summary.
    """
    db = get_database()
    inventory_coll = db[INVENTORY_COLLECTION]
    orders_coll = db[ORDERS_COLLECTION]

    pipes_consumed = 0
    returned_to_stock = 0
    discarded = 0
    fulfillment_detail = []
    returned_pipes_detail = []  # Track returned pipes by dimensions

    for f in request.fulfillments:
        pipe_id = f.get("pipe_id")
        quantity_to_deduct = f.get("quantity_to_deduct", 0)
        if not pipe_id or quantity_to_deduct < 1:
            continue
        try:
            oid = ObjectId(pipe_id)
        except Exception:
            continue
        doc = await inventory_coll.find_one({"_id": oid})
        if not doc:
            continue
        new_qty = doc["quantity"] - quantity_to_deduct
        pipes_consumed += quantity_to_deduct
        if new_qty <= 0:
            await inventory_coll.delete_one({"_id": oid})
        else:
            await inventory_coll.update_one({"_id": oid}, {"$set": {"quantity": new_qty}})
        # Format dimensions - remove .0 for whole numbers
        def fmt_dim(d):
            if d == int(d):
                return str(int(d))
            return str(d)
        fulfillment_detail.append(
            {
                "pipe_id": pipe_id,
                "quantity_deducted": quantity_to_deduct,
                "from_supplier": doc.get("from", ""),
                "dimensions": f"{fmt_dim(doc['length'])} × {fmt_dim(doc['width'])} × {fmt_dim(doc['height'])}",
            }
        )

    # Aggregate returned and discarded pipes by dimensions for display
    returned_map = {}
    discarded_map = {}
    for rd in request.remainder_decisions:
        key = f"{rd.remainder_length}-{rd.width}-{rd.height}-{rd.from_supplier}"
        pipe_info = {
            "length": rd.remainder_length,
            "width": rd.width,
            "height": rd.height,
            "from_supplier": rd.from_supplier,
            "quantity": 0,
        }
        if not rd.keep:
            discarded += 1
            if key not in discarded_map:
                discarded_map[key] = pipe_info.copy()
            discarded_map[key]["quantity"] += 1
            continue
        returned_to_stock += 1
        # Merge by dimensions + supplier so same pipe size shows as one row with total quantity
        await inventory_coll.update_one(
            {
                "from": rd.from_supplier,
                "length": rd.remainder_length,
                "width": rd.width,
                "height": rd.height,
            },
            {"$inc": {"quantity": 1}},
            upsert=True,
        )
        # Track for order record
        if key not in returned_map:
            returned_map[key] = pipe_info.copy()
        returned_map[key]["quantity"] += 1

    summary = {
        "pipes_consumed": pipes_consumed,
        "returned_to_stock": returned_to_stock,
        "discarded": discarded,
    }
    order_record = {
        "recipient": request.recipient,
        "summary": summary,
        "fulfillment_detail": fulfillment_detail,
        "returned_pipes_detail": list(returned_map.values()),  # List of returned pipes with dimensions
        "discarded_pipes_detail": list(discarded_map.values()),  # List of discarded pipes with dimensions
        "analysis": request.analysis if hasattr(request, 'analysis') else [],  # Store analysis for visualization
        "created_at": datetime.now(timezone.utc),
    }
    result = await orders_coll.insert_one(order_record)
    order_record["id"] = str(result.inserted_id)

    return {
        "recipient": request.recipient,
        "summary": summary,
        "fulfillment_detail": fulfillment_detail,
        "order_id": order_record["id"],
    }
