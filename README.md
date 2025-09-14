# Personal Finance Assistant — Final Pack

This package contains a completed Personal Finance Assistant project:
- Backend: FastAPI + MongoDB, JWT auth, OCR parsing, rate-limiter middleware, smoke-test script
- Frontend: React (Vite) app (login/register, upload receipt, transactions, charts)

## What changed in this final pack
1. Frontend now sends the JWT in the standard `Authorization: Bearer <token>` header.
2. Backend accepts Authorization header (HTTPBearer) and validates tokens.
3. Simple in-memory rate-limiter middleware added (not for production).
4. `auto_create=true` for `/api/ocr` will parse amounts from receipts and create expense transactions automatically.
5. `backend/smoke_test.py` helps exercise the API endpoints locally.

## System prerequisites
- Python 3.11+
- Node.js 18+ and npm
- MongoDB running locally or Atlas
- System binaries for OCR: `tesseract` and `poppler` (for pdf2image)

On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y tesseract-ocr poppler-utils
```

## Backend setup
1. Create and activate venv
```bash
python -m venv .venv
source .venv/bin/activate
```
2. Install requirements
```bash
pip install -r backend/requirements.txt
```
3. Copy `.env.example` to `.env` and set `MONGO_URI` and `SECRET_KEY`
```bash
cp backend/.env.example backend/.env
# edit backend/.env
```
4. Run the backend
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. (Optional) Run smoke test
```bash
python smoke_test.py
```

## Frontend setup
1. Install node modules and run dev server
```bash
cd frontend/pfa-frontend
npm install
npm run dev
```
2. Open the URL shown by Vite (http://localhost:5173) and use the app.

## Notes
- The rate limiter is an in-memory implementation and will not work across multiple workers.
- OCR parsing is heuristic. For best results, use clear images or PDFs.

