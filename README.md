# Pipe Inventory Management System

Full-stack app: **FastAPI** backend, **MongoDB** database, **React** frontend. Runs on localhost.

## Prerequisites

- **Python 3.11+**
- **Node 18+**
- **MongoDB** running locally on port **27017**

## Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

If `uvicorn` isn't found, run `python -m uvicorn` (above) so it uses the same Python where you installed packages. If you have multiple Python versions, use that interpreter explicitly (e.g. `py -3.13 -m uvicorn main:app --reload --port 8000`).

API docs: http://localhost:8000/docs

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at **http://localhost:5173**

## Usage

1. **Inventory** — View and delete stock; dimensions in `L × W × H`, sorted by length.
2. **Add Stock** — Enter supplier and pipe rows (length, width, height, quantity); adds or merges into existing matching entries.
3. **Publish Order** — Enter recipient and requirements → **Analyse Order** → review cuts and remainder decisions → **Confirm & Execute Order** → see summary and return to Inventory.
