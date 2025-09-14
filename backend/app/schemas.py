from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TransactionCreate(BaseModel):
    type: str = Field(..., regex="^(income|expense)$")
    amount: float
    category: Optional[str] = None
    note: Optional[str] = None
    date: Optional[datetime] = None

class TransactionOut(TransactionCreate):
    id: str

class OCRResult(BaseModel):
    text: str
    parsed_transactions: Optional[list] = None
