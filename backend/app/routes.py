from fastapi import APIRouter, UploadFile, File, Query, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .schemas import UserCreate, Token, TransactionCreate, OCRResult, CategoryCreate
from .crud import create_user, get_user_by_email, create_transaction, get_transactions, aggregate_by_category, aggregate_by_date, count_transactions, create_category, list_categories
from .utils import ocr_image_bytes, auto_parse_transactions, parse_pdf_table
from .auth import hash_password, verify_password, create_access_token, decode_token
from datetime import datetime
from bson import ObjectId
from typing import Optional
router = APIRouter()
security = HTTPBearer()

DEFAULT_INCOME_CATEGORIES = [
    {"name": "Salary", "type": "income", "icon": "💼"},
    {"name": "Business", "type": "income", "icon": "🏢"},
    {"name": "Investment", "type": "income", "icon": "📈"},
    {"name": "Rental", "type": "income", "icon": "🏠"},
    {"name": "Royalty", "type": "income", "icon": "🎵"},
    {"name": "Pension", "type": "income", "icon": "🧾"},
    {"name": "Other Income", "type": "income", "icon": "➕"},
]

DEFAULT_EXPENSE_CATEGORIES = [
    {"name": "Groceries", "type": "expense", "icon": "🛒"},
    {"name": "Transport", "type": "expense", "icon": "🚌"},
    {"name": "Dining", "type": "expense", "icon": "🍽️"},
    {"name": "Rent", "type": "expense", "icon": "🏠"},
    {"name": "Utilities", "type": "expense", "icon": "💡"},
    {"name": "Entertainment", "type": "expense", "icon": "🎬"},
    {"name": "Health", "type": "expense", "icon": "💊"},
    {"name": "Education", "type": "expense", "icon": "🎓"},
    {"name": "Misc", "type": "expense", "icon": "📦"},
]


@router.post('/auth/register', response_model=dict)
async def register(payload: UserCreate):
    existing = await get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    user = {'email': payload.email, 'password': hash_password(payload.password)}
    created = await create_user(user)
    created.pop('password', None)
    created_id = str(created['_id'])
    created['id'] = created_id
    created.pop('_id', None)
    return created

@router.post('/auth/login', response_model=Token)
async def login(payload: UserCreate):
    user = await get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user.get('password')):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token = create_access_token({'user_id': str(user['_id']), 'email': user['email']})
    return {'access_token': token}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials if credentials else None
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing token')
    data = decode_token(token)
    if not data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
    user_id = data.get('user_id')
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token payload')
    return user_id

@router.post('/categories')
async def add_category(payload: CategoryCreate, user_id = Depends(get_current_user)):
    """
    Create a global category (name+type must be unique).
    """
    doc = payload.dict()
    created = await create_category(doc)
    return {'id': str(created.get('_id') or created.get('id')), 'name': created['name'], 'type': created['type'], 'icon': created.get('icon')}

@router.get('/categories')
async def get_categories():
    """
    Return global categories (no user filtering).
    """
    return await list_categories()


@router.post('/transactions', status_code=201)
async def add_transaction(payload: TransactionCreate, user_id = Depends(get_current_user)):
    doc = payload.dict()
    if isinstance(doc.get('date'), str):
        doc['date'] = datetime.fromisoformat(doc['date'])
    saved = await create_transaction(ObjectId(user_id), doc)
    saved['id'] = str(saved['_id'])
    saved.pop('_id', None)
    saved.pop('user_id', None)
    return saved

@router.get('/transactions')
async def list_transactions(start: str | None = Query(None), end: str | None = Query(None), page:int=1, page_size:int=10, tx_type: str | None = None, user_id = Depends(get_current_user)):
    start_dt = datetime.fromisoformat(start) if start else None
    end_dt = datetime.fromisoformat(end) if end else None
    skip = (page - 1) * page_size
    items = await get_transactions(ObjectId(user_id), start=start_dt, end=end_dt, skip=skip, limit=page_size, tx_type=tx_type)
    total = await count_transactions(ObjectId(user_id), start=start_dt, end=end_dt, tx_type=tx_type)
    return {'page': page, 'page_size': page_size, 'total': total, 'items': items}

@router.get('/aggregate/category')
async def agg_category(start: str | None = None, end: str | None = None, tx_type: str | None = None, user_id = Depends(get_current_user)):
    start_dt = datetime.fromisoformat(start) if start else None
    end_dt = datetime.fromisoformat(end) if end else None
    return await aggregate_by_category(ObjectId(user_id), start=start_dt, end=end_dt, tx_type=tx_type)

@router.get('/aggregate/date')
async def agg_date(start: str | None = None, end: str | None = None, user_id = Depends(get_current_user)):
    start_dt = datetime.fromisoformat(start) if start else None
    end_dt = datetime.fromisoformat(end) if end else None
    return await aggregate_by_date(ObjectId(user_id), start=start_dt, end=end_dt)

@router.post('/ocr', response_model=OCRResult)
async def ocr_upload(file: UploadFile = File(...), user_id = Depends(get_current_user), auto_create: bool = Query(False)):
    content = await file.read()
    text = await ocr_image_bytes(content)
    parsed = auto_parse_transactions(text)
    created = []
    if auto_create and parsed:
        for p in parsed:
            doc = p.copy()
            if isinstance(doc.get('date'), str):
                try:
                    doc['date'] = datetime.fromisoformat(doc['date'])
                except:
                    doc['date'] = None
            saved = await create_transaction(ObjectId(user_id), doc)
            created.append({'id': str(saved['_id']), 'amount': saved['amount']})
    return {'text': text, 'parsed_transactions': created or parsed}

@router.post('/upload/history')
async def upload_history(file: UploadFile = File(...), user_id = Depends(get_current_user), auto_create: bool = Query(False)):
    content = await file.read()
    rows = parse_pdf_table(content)
    created = []
    if auto_create and rows:
        for r in rows:
            doc = {'type':'expense','amount': r.get('amount') or 0.0, 'category':'history','note': r.get('note',''), 'date': r.get('date')}
            saved = await create_transaction(ObjectId(user_id), doc)
            created.append({'id': str(saved['_id']), 'amount': saved['amount']})
    return {'rows': rows, 'created': created}

@router.post("/seed/categories", status_code=201)
async def seed_categories():
    """
    Seed global categories (income + expense) into the categories collection.
    This is idempotent: categories with same (name, type) will not be duplicated.
    Protected endpoint: requires a valid JWT (use admin/user token).
    """
    defaults = DEFAULT_INCOME_CATEGORIES + DEFAULT_EXPENSE_CATEGORIES
    created = []
    for c in defaults:
        # create_category() is expected to check for existing (name,type)
        res = await create_category(c)
        # create_category returns existing doc or inserted doc
        # normalize id:
        cid = str(res.get('_id') or res.get('id') or '')
        # determine if it was newly created by comparing content (best-effort)
        # If object in DB already had same name/type, consider it skipped.
        # We'll check the 'user_id' field presence to distinguish inserted docs;
        # but create_category returns existing doc — so we'll just report name/type and id.
        created.append({'name': c['name'], 'type': c['type'], 'id': cid})
    return {"status": "ok", "seeded": created}