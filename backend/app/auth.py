from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import datetime, timedelta
from . import crud, database
from sqlalchemy.orm import Session

SECRET = 'please_change_me_in_prod'
ALGORITHM = 'HS256'
ACCESS_EXPIRE_MIN = 60*24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='token')

def create_access_token(data: dict, expires_delta: int = ACCESS_EXPIRE_MIN):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_delta)
    to_encode.update({'exp': expire})
    return jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        user_id = int(payload.get('sub'))
    except JWTError:
        raise HTTPException(401, 'Could not validate credentials')
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(401, 'User not found')
    return user

def authenticate_user(db: Session, email: str, password: str):
    user = crud.get_user_by_email(db, email)
    if not user:
        return None
    # naive check: store hashed password in prod
    if user.hashed_password != password:
        return None
    return user