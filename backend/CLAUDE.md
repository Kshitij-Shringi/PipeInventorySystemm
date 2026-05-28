# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run backend (from backend/)
source backendenv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

API docs at http://localhost:8000/docs

## Environment

Copy `.env.example` to `.env`. Required vars:
- `MONGO_URI` — defaults to `mongodb://localhost:27017/pipe_inventory`
- `JWT_SECRET_KEY` — must be set in production
- `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` — auto-seeded on startup if set
- `CORS_ORIGINS` — comma-separated allowed origins; do **not** set to empty string (blocks all)

## Architecture

**Multi-tenant MongoDB layout:**
- `pipe_inventory_control` — shared control-plane DB; holds `tenants`, `users`, `tenant_requests` collections
- `pipe_inventory_{slug}_{6-char-id}` — one isolated DB per tenant; holds `inventory`, `orders`, `stock_activity`

`database.py` exposes three helpers: `get_control_database()`, `get_tenant_database(db_name)`, and `get_legacy_single_tenant_database()` (backwards-compat for dev seeding).

**Auth / roles:**
- JWT issued at `/api/auth/login` (tenant users) or `/api/auth/admin-login` (superadmin)
- Token payload carries `sub` (user ObjectId), `tenant_id`, `role`, `email`
- `security.py` provides `get_current_active_user` (all authenticated users) and `get_current_superadmin` (role=superadmin guard)
- Roles: `superadmin` (global), `tenant_admin` (full tenant control), `user` (read/write inventory & orders)
- All `/api/admin/*` routes use `get_current_superadmin` as a router-level dependency

**Route modules (`routes/`):**
- `auth.py` — login, user CRUD within a tenant, tenant settings, password change
- `admin.py` — superadmin: tenant CRUD, tenant-request approve/reject, per-tenant stats
- `inventory.py` — stock CRUD, bulk-delete, add-stock (merge by dimensions), stock activity log
- `orders.py` — order analysis engine + order execution

**Order matching engine (`routes/orders.py`):**
- `POST /api/orders/analyse` — pure read; runs `resolve_requirement_with_weld()` against current inventory. Returns cuts, exact matches, and weld plans. Does NOT modify DB.
- `POST /api/orders/execute` — commits deductions, handles remainder keep/discard decisions, writes order record.
- Matching priority: exact match → cut from longer pipe → weld from multiple shorter pipes (`_build_weld_plan`). Virtual remainder pipes (prefixed `virtual_`) represent cut-offs produced earlier in the same analysis run and are preferred over real inventory.

**MongoDB field note:** inventory documents store supplier as `"from"` (not `"from_supplier"`). The `_doc_to_item` helper remaps it on read.
