from pydantic import BaseModel
from datetime import datetime

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class TransactionBase(BaseModel):
    amount: float
    category: str | None = 'uncategorized'
    description: str | None = ''
    date: datetime
    type: str  # income or expense

class TransactionCreate(TransactionBase):
    pass

class TransactionOut(TransactionBase):
    id: int
    user_id: int
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class UserAuth(BaseModel):
    email: str
    password: str