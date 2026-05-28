# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# From frontend/
npm install
npm run dev      # http://localhost:5173
npm run build    # output to dist/
npm run preview  # serve dist/ locally
```

## Environment

Copy `.env.example` to `.env`:
- `VITE_API_BASE_URL` — defaults to `http://localhost:8000/api`; set to `https://pinventory-api.pedalsupclients.xyz/api` for production builds

## Architecture

**Two parallel API clients (`src/api.js`):**
- `api` — tenant-user axios instance; injects `authToken` from module-level variable + localStorage (`auth_token`)
- `adminApi` — superadmin axios instance; injects `adminToken` from localStorage (`admin_auth_token`)
- A 401 response on `api` auto-clears the token and redirects to `/login`
- All API calls are exported as named functions from `api.js`; screens never call axios directly

**Auth state (`src/AuthContext.jsx`):**
- `AuthProvider` wraps the app and exposes `isAuthenticated`, `isTenantAdmin`, `user`, `tenant` via `useAuth()`
- Token is loaded from localStorage on mount; `fetchSession()` call to `/auth/me` populates user/tenant info

**Routing (`src/App.jsx`):**
- `PrivateRoute` — requires authentication
- `AdminRoute` — requires `isTenantAdmin`
- `/admin/*` routes are completely separate from tenant routes (no shared Navbar); superadmin login is at `/admin/login`

**Publish Order flow (`src/screens/PublishOrder/`):**
- Multi-step wizard: `OrderForm` → `AnalysisView` → `OrderSummary`
- Uses React Router nested routes (`/publish-order/*`)
- `AnalysisView` presents the matching engine results (cuts, welds, remainders) and collects `remainder_decisions` (keep/discard) before calling `executeOrder`

**Styling:** Tailwind CSS + `framer-motion` for animations. No component library — all UI is custom.

**PDF export (`src/utils/planPdf.js`):** uses `jspdf` + `jspdf-autotable` to generate order plan PDFs client-side.
