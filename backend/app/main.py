# main.py
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, crud, ocr_utils, auth, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Typeface Finance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post('/register', response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    if crud.get_user_by_email(db, user.email):
        raise HTTPException(400, 'Email already registered')
    return crud.create_user(db, user)

@app.post('/token', response_model=schemas.Token)
def login(form_data: schemas.UserAuth, db: Session = Depends(database.get_db)):
    user = auth.authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token = auth.create_access_token({'sub': str(user.id)})
    return {'access_token': token, 'token_type': 'bearer'}

@app.post('/transactions', response_model=schemas.TransactionOut)
def create_tx(tx: schemas.TransactionCreate, db: Session = Depends(database.get_db), current_user=Depends(auth.get_current_user)):
    return crud.create_transaction(db, tx, current_user.id)

@app.get('/transactions', response_model=list[schemas.TransactionOut])
def list_transactions(skip: int = 0, limit: int = 50, start_date: str | None = None, end_date: str | None = None, db: Session = Depends(database.get_db), current_user=Depends(auth.get_current_user)):
    return crud.get_transactions(db, current_user.id, skip=skip, limit=limit, start_date=start_date, end_date=end_date)

@app.post('/upload/receipt')
async def upload_receipt(file: UploadFile = File(...), db: Session = Depends(database.get_db), current_user=Depends(auth.get_current_user)):
    contents = await file.read()
    results = ocr_utils.parse_receipt(contents, file.filename)
    # optionally save extracted transactions
    created = []
    for item in results:
        tx = schemas.TransactionCreate(**item)
        created.append(crud.create_transaction(db, tx, current_user.id))
    return {'parsed': results, 'created_count': len(created)}

@app.get('/graphs/summary')
def graphs_summary(db: Session = Depends(database.get_db), current_user=Depends(auth.get_current_user)):
    return crud.summarize_transactions(db, current_user.id)

