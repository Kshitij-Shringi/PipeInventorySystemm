from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from zoneinfo import ZoneInfoNotFoundError

from database import get_tenant_database, INVENTORY_COLLECTION, ORDERS_COLLECTION
from security import get_current_active_user
from models import OrderRequest, ExecuteOrderRequest

router = APIRouter(prefix="/orders", tags=["orders"])
try:
    IST = ZoneInfo("Asia/Kolkata")
except ZoneInfoNotFoundError:
    # Fallback for Windows/Python environments missing tzdata package.
    IST = timezone(timedelta(hours=5, minutes=30), name="IST")


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


def _float_eq(a: float, b: float, eps: float = 1e-4) -> bool:
    try:
        return abs(float(a) - float(b)) <= eps
    except Exception:
        return False


def _select_pipe(local_inventory: dict, *, req_width: float, req_height: float, predicate):
    """Return a pipe dict from local_inventory matching dims and predicate, preferring virtual_ pipes."""
    virtual = next(
        (
            p
            for p in local_inventory.values()
            if str(p.get("id", "")).startswith("virtual_")
            and _float_eq(p.get("width"), req_width)
            and _float_eq(p.get("height"), req_height)
            and p.get("quantity", 0) > 0
            and predicate(p)
        ),
        None,
    )
    if virtual is not None:
        return virtual
    return next(
        (
            p
            for p in local_inventory.values()
            if not str(p.get("id", "")).startswith("virtual_")
            and _float_eq(p.get("width"), req_width)
            and _float_eq(p.get("height"), req_height)
            and p.get("quantity", 0) > 0
            and predicate(p)
        ),
        None,
    )


def _build_weld_plan(local_inventory: dict, req_length: float, req_width: float, req_height: float):
    """
    Build ONE welded unit plan to satisfy req_length using available pipes (same W/H).
    Returns dict with:
      - assembly: weld summary (no pipe_id)
      - ops: list of per-pipe consumption ops (with pipe_id, quantity_used=1)
    """
    remaining = float(req_length)

    # Try a few alternatives for the first pick to avoid obvious greedy dead-ends.
    short_candidates = sorted(
        [
            p
            for p in local_inventory.values()
            if _float_eq(p.get("width"), req_width)
            and _float_eq(p.get("height"), req_height)
            and p.get("quantity", 0) > 0
            and float(p.get("length")) <= remaining + 1e-4
        ],
        key=lambda p: float(p.get("length")),
        reverse=True,
    )

    first_try_list = [None] + short_candidates[:5]

    for first in first_try_list:
        # Work on a scratch copy so we can backtrack the first choice.
        scratch = {k: dict(v) for k, v in local_inventory.items()}
        segs = []
        ops_local = []
        rem = float(req_length)
        virtual_counter = 1

        def consume_pipe(pipe: dict, segment_length: float, remainder: float):
            nonlocal virtual_counter
            pid = pipe["id"]
            scratch[pid]["quantity"] -= 1
            op = {
                "pipe_id": pid,
                "from_supplier": pipe.get("from_supplier", ""),
                "source_length": float(pipe["length"]),
                "width": float(pipe["width"]),
                "height": float(pipe["height"]),
                "quantity_used": 1,
                "cut_type": "segment_cut" if remainder > 0 else "segment",
                "segment_length": float(segment_length),
                "remainder": round(float(remainder), 4),
                "part_of_weld": True,
            }
            ops_local.append(op)
            segs.append(
                {
                    "pipe_id": pid,
                    "from_supplier": pipe.get("from_supplier", ""),
                    "source_length": float(pipe["length"]),
                    "segment_length": float(segment_length),
                    "remainder": round(float(remainder), 4),
                }
            )

            # Immediately make remainder available as a virtual pipe (so it can be consumed
            # by later pieces/segments within the same requirement run).
            if remainder and remainder > 1e-4:
                # Ensure uniqueness
                while True:
                    vid = f"virtual_local_{virtual_counter}"
                    virtual_counter += 1
                    if vid not in scratch:
                        break
                scratch[vid] = {
                    "id": vid,
                    "length": round(float(remainder), 4),
                    "width": float(pipe["width"]),
                    "height": float(pipe["height"]),
                    "quantity": 1,
                    "from_supplier": pipe.get("from_supplier", ""),
                }

        # Optional forced first pick (a full short pipe)
        if first is not None:
            if scratch[first["id"]]["quantity"] <= 0:
                continue
            take = min(float(first["length"]), rem)
            remainder = 0.0
            # If first pipe is longer than rem, we will cut it instead (should not happen due to candidate filter).
            consume_pipe(first, take, remainder)
            rem = round(rem - take, 4)

        guard = 0
        while rem > 1e-4 and guard < 50:
            guard += 1
            # Exact remainder match
            exact = _select_pipe(
                scratch,
                req_width=req_width,
                req_height=req_height,
                predicate=(lambda p, rem=rem: _float_eq(p.get("length"), rem)),
            )
            if exact is not None:
                consume_pipe(exact, rem, 0.0)
                rem = 0.0
                break

            # Use whole short pipe segment (largest <= rem) to avoid creating new waste
            shorts = [
                p
                for p in scratch.values()
                if _float_eq(p.get("width"), req_width)
                and _float_eq(p.get("height"), req_height)
                and p.get("quantity", 0) > 0
                and float(p.get("length")) <= rem + 1e-4
            ]
            if not shorts:
                # Cut from the SHORTEST longer pipe to minimize remainder
                longer_candidates = [
                    p
                    for p in scratch.values()
                    if _float_eq(p.get("width"), req_width)
                    and _float_eq(p.get("height"), req_height)
                    and p.get("quantity", 0) > 0
                    and float(p.get("length")) > rem + 1e-4
                ]
                if not longer_candidates:
                    break
                longer = min(longer_candidates, key=lambda p: float(p.get("length")))
                remainder = float(longer["length"]) - rem
                consume_pipe(longer, rem, remainder)
                rem = 0.0
                break

            best = max(shorts, key=lambda p: float(p.get("length")))
            consume_pipe(best, float(best["length"]), 0.0)
            rem = round(rem - float(best["length"]), 4)

        if rem <= 1e-4 and segs:
            welds = max(0, len(segs) - 1)
            assembly = {
                "cut_type": "weld",
                "required_length": float(req_length),
                "width": float(req_width),
                "height": float(req_height),
                "segments": segs,
                "welds_needed": welds,
            }
            # Commit scratch back to local_inventory (including any virtual remainders we created).
            # We overwrite quantities and also add new virtual ids if needed.
            for pid, val in scratch.items():
                if pid in local_inventory:
                    local_inventory[pid]["quantity"] = val.get("quantity", 0)
                else:
                    local_inventory[pid] = dict(val)
            return {"assembly": assembly, "ops": ops_local}

    return None


def resolve_requirement_with_weld(
    inventory: list[dict],
    req_length: float,
    req_width: float,
    req_height: float,
    req_qty: int,
):
    """
    Like resolve_requirement, but if no exact/longer pipe exists, it will propose a weld plan
    using multiple pipes (and cutting) to satisfy the length. Remainders are emitted as usual
    (remainder > 0) and can be kept/discarded in the publish flow.
    """
    results = []
    remaining = req_qty
    local_inventory = {p["id"]: dict(p) for p in inventory}
    virtual_counter = 1

    def add_virtual_remainder(length: float, width: float, height: float, from_supplier: str):
        nonlocal virtual_counter
        if not length or float(length) <= 1e-4:
            return
        while True:
            vid = f"virtual_local_{virtual_counter}"
            virtual_counter += 1
            if vid not in local_inventory:
                break
        local_inventory[vid] = {
            "id": vid,
            "length": round(float(length), 4),
            "width": float(width),
            "height": float(height),
            "quantity": 1,
            "from_supplier": from_supplier or "",
        }

    while remaining > 0:
        # Exact match (prefer virtual)
        exact = _select_pipe(
            local_inventory,
            req_width=req_width,
            req_height=req_height,
            predicate=lambda p: _float_eq(p.get("length"), req_length),
        )
        if exact:
            take = min(int(exact["quantity"]), remaining)
            results.append(
                {
                    "pipe_id": exact["id"],
                    "from_supplier": exact.get("from_supplier", ""),
                    "source_length": float(exact["length"]),
                    "width": float(exact["width"]),
                    "height": float(exact["height"]),
                    "quantity_used": take,
                    "cut_type": "exact",
                    "remainder": 0,
                }
            )
            local_inventory[exact["id"]]["quantity"] -= take
            remaining -= take
            continue

        # Cut from a longer pipe (same as existing behavior)
        candidates = sorted(
            [
                p
                for p in local_inventory.values()
                if float(p["length"]) > float(req_length) + 1e-4
                and _float_eq(p.get("width"), req_width)
                and _float_eq(p.get("height"), req_height)
                and p.get("quantity", 0) > 0
            ],
            key=lambda p: float(p["length"]),
        )
        if candidates:
            source = candidates[0]
            fits_in_one_pipe = int(float(source["length"]) // float(req_length))
            cuts_this_pipe = min(fits_in_one_pipe, remaining)
            total_used_length = float(req_length) * cuts_this_pipe
            remainder = round(float(source["length"]) - total_used_length, 4)
            local_inventory[source["id"]]["quantity"] -= 1
            remaining -= cuts_this_pipe
            results.append(
                {
                    "pipe_id": source["id"],
                    "from_supplier": source.get("from_supplier", ""),
                    "source_length": float(source["length"]),
                    "width": float(source["width"]),
                    "height": float(source["height"]),
                    "quantity_used": 1,
                    "cut_type": "cut",
                    "cuts_from_this_pipe": cuts_this_pipe,
                    "used_length": total_used_length,
                    "remainder": remainder,
                    "cut_length": float(req_length),
                }
            )
            # Make the remainder immediately reusable within the same requirement.
            if remainder > 1e-4:
                add_virtual_remainder(
                    remainder,
                    float(source["width"]),
                    float(source["height"]),
                    source.get("from_supplier", ""),
                )
            continue

        # Weld plan for ONE unit
        plan = _build_weld_plan(local_inventory, req_length, req_width, req_height)
        if not plan:
            results.append({"unfulfilled": remaining})
            break

        # Add one assembly entry for display + underlying ops for deductions/remainders.
        results.append(plan["assembly"])
        results.extend(plan["ops"])
        remaining -= 1

    return results

@router.get("")
async def list_orders(
    start_date: str = None,
    end_date: str = None,
    page: int = 1,
    page_size: int = 10,
    current_user: dict = Depends(get_current_active_user),
):
    """
    List orders with date filtering and pagination.
    start_date, end_date: ISO format date strings (YYYY-MM-DD)
    page: Page number (1-indexed)
    page_size: Items per page
    """
    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    coll = db[ORDERS_COLLECTION]
    
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
    orders = []
    async for doc in cursor:
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        if "created_at" in doc:
            if isinstance(doc["created_at"], datetime):
                doc["created_at"] = _to_ist_iso(doc["created_at"])
            else:
                doc["created_at"] = str(doc["created_at"])
        orders.append(doc)
    
    return {
        "items": orders,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


@router.post("/analyse")
async def analyse_order(request: OrderRequest, current_user: dict = Depends(get_current_active_user)):
    """
    Run matching engine on requirements; does NOT modify DB.
    Uses remainders from earlier requirements to fulfill later ones.
    """
    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
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

        # Resolve this requirement using combined inventory (supports weld plans)
        req_results = resolve_requirement_with_weld(
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
                if pid.startswith("virtual_"):
                    # Deduct from remainder inventory by dimensions (works for both cross-requirement
                    # virtual ids and same-requirement virtual_local_* ids).
                    rem_key = (
                        r.get("source_length"),
                        r.get("width"),
                        r.get("height"),
                        r.get("from_supplier", ""),
                    )
                    if rem_key in remainder_inventory:
                        remainder_inventory[rem_key] = max(0, remainder_inventory[rem_key] - q)
                        if remainder_inventory[rem_key] == 0:
                            del remainder_inventory[rem_key]
                    # Also cleanup old mapping if present
                    if pid in virtual_id_to_key:
                        del virtual_id_to_key[pid]
                else:
                    # Deduct from real inventory
                    for p in inventory:
                        if p["id"] == pid:
                            p["quantity"] -= q
                            break

                # If this was a cut/segment-cut operation, add remainder to virtual inventory
                if r.get("cut_type") in ("cut", "segment_cut") and r.get("remainder", 0) > 0:
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
async def execute_order(request: ExecuteOrderRequest, current_user: dict = Depends(get_current_active_user)):
    """
    Deduct quantities from used pipes (delete if quantity hits 0).
    Insert remainder pipes where keep=True.
    Save order to orders collection. Return order summary.
    """
    db_name = current_user.get("tenant_db_name")
    db = get_tenant_database(db_name)
    inventory_coll = db[INVENTORY_COLLECTION]
    orders_coll = db[ORDERS_COLLECTION]

    pipes_consumed = 0
    returned_to_stock = 0
    discarded = 0
    fulfillment_detail = []

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
        "created_at": _now_ist_iso(),
    }
    result = await orders_coll.insert_one(order_record)
    order_record["id"] = str(result.inserted_id)

    return {
        "recipient": request.recipient,
        "summary": summary,
        "fulfillment_detail": fulfillment_detail,
        "order_id": order_record["id"],
        "analysis": request.analysis if hasattr(request, 'analysis') else [],
    }
