from fastapi import APIRouter, UploadFile, File, Query, Depends, HTTPException, status
from .schemas import UserCreate, Token, TransactionCreate, OCRResult
from .crud import create_user, get_user_by_email, create_transaction, get_transactions, aggregate_by_category, aggregate_by_date
from .utils import ocr_image_bytes, auto_parse_transactions
from .auth import hash_password, verify_password, create_access_token, decode_token
from datetime import datetime
from bson import ObjectId
from typing import Optional

router = APIRouter()

# Auth/register/login
@router.post('/auth/register', response_model=dict)
async def register(payload: UserCreate):
    existing = await get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    user = {"email": payload.email, "password": hash_password(payload.password)}
    created = await create_user(user)
    created.pop('password', None)
    created['id'] = str(created['_id'])
    created.pop('_id', None)
    return created

@router.post('/auth/login', response_model=Token)
async def login(payload: UserCreate):
    user = await get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user.get('password')):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token = create_access_token({"user_id": str(user['_id']), "email": user['email']})
    return {"access_token": token}

# dependency
async def get_current_user(token: Optional[str] = Query(None)):
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing token')
    data = decode_token(token)
    if not data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
    user_id = data.get('user_id')
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token payload')
    return user_id

@router.post('/transactions', status_code=201)
async def add_transaction(payload: TransactionCreate, user_id = Depends(get_current_user)):
    doc = payload.dict()
    if isinstance(doc.get('date'), str):
        doc['date'] = datetime.fromisoformat(doc['date'])
    saved = await create_transaction(ObjectId(user_id), doc)
    saved['id'] = str(saved['_id'])
    saved.pop('_id', None)
    return saved

@router.get('/transactions')
async def list_transactions(start: str | None = Query(None), end: str | None = Query(None), page:int=1, page_size:int=50, tx_type: str | None = None, user_id = Depends(get_current_user)):
    start_dt = datetime.fromisoformat(start) if start else None
    end_dt = datetime.fromisoformat(end) if end else None
    skip = (page - 1) * page_size
    docs = await get_transactions(ObjectId(user_id), start=start_dt, end=end_dt, skip=skip, limit=page_size, tx_type=tx_type)
    return {"page": page, "page_size": page_size, "items": docs}

@router.get('/aggregate/category')
async def agg_category(start: str | None = None, end: str | None = None, user_id = Depends(get_current_user)):
    start_dt = datetime.fromisoformat(start) if start else None
    end_dt = datetime.fromisoformat(end) if end else None
    return await aggregate_by_category(ObjectId(user_id), start=start_dt, end=end_dt)

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
            created.append({"id": str(saved['_id']), "amount": saved['amount']})
    return {"text": text, "parsed_transactions": created or parsed}
