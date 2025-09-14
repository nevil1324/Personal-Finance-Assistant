from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
class UserCreate(BaseModel):
    email: EmailStr
    password: str
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
class CategoryCreate(BaseModel):
    name: str
    type: str = Field(..., pattern="^(income|expense)$")
class CategoryOut(CategoryCreate):
    id: str
class TransactionCreate(BaseModel):
    type: str = Field(..., pattern="^(income|expense)$")
    amount: float
    category: Optional[str] = None
    note: Optional[str] = None
    date: Optional[datetime] = None
class TransactionOut(TransactionCreate):
    id: str
class OCRResult(BaseModel):
    text: str
    parsed_transactions: Optional[List[dict]] = None
