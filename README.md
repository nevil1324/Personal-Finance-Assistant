# Typeface - Personal Finance Assistant

Author: Nevil Sakhreliya

Short: Full-stack app (FastAPI backend + React frontend) to track income/expenses and extract transactions from receipts (images & PDFs). Uses MongoDB.

## Quickstart (backend)
1. Install Python 3.10+.
2. Create venv:
   ```
   python -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```
3. Set environment variables (example `.env`):
   ```
   MONGODB_URI=mongodb://localhost:27017/typeface
   SECRET_KEY=please_change_me
   ```
4. Run backend:
   ```
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Quickstart (frontend)
1. Install Node 18+.
2. From `frontend/`:
   ```
   npm install
   npm run dev
   ```

## Notes
- Tesseract binary is required for OCR (install via your OS package manager).
- For local MongoDB, run `mongod` or use Docker / Atlas.
- This repo skeleton is ready to commit; replace SECRET_KEY and secure passwords when submitting.
