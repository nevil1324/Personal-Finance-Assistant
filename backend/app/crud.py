from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime

# user helpers

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(email=user.email, hashed_password=user.password)
    db.add(db_user); db.commit(); db.refresh(db_user)
    return db_user

# transactions

def create_transaction(db: Session, tx: schemas.TransactionCreate, user_id: int):
    db_tx = models.Transaction(user_id=user_id, amount=tx.amount, category=tx.category, description=tx.description, date=tx.date, type=tx.type)
    db.add(db_tx); db.commit(); db.refresh(db_tx)
    return db_tx


def get_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 50, start_date=None, end_date=None):
    q = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.date.desc())
    if start_date:
        q = q.filter(models.Transaction.date >= datetime.fromisoformat(start_date))
    if end_date:
        q = q.filter(models.Transaction.date <= datetime.fromisoformat(end_date))
    return q.offset(skip).limit(limit).all()


def summarize_transactions(db: Session, user_id: int):
    # simple summary: total income, total expense, by category totals
    txs = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()
    total_income = sum(t.amount for t in txs if t.type == 'income')
    total_expense = sum(t.amount for t in txs if t.type == 'expense')
    by_cat = {}
    for t in txs:
        cat = t.category or 'uncategorized'
        by_cat[cat] = by_cat.get(cat, 0) + t.amount
    return {'total_income': total_income, 'total_expense': total_expense, 'by_category': by_cat}