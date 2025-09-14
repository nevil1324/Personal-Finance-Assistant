# backend/app/crud.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
import motor.motor_asyncio
import os

# --- Configuration ---
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('MONGO_DB', 'pfa_db')

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

USERS_COL = 'users'
TRAN_COL = 'transactions'
CAT_COL = 'categories'

# -----------------------
# User helpers
# -----------------------
async def create_user(user_doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Insert user_doc (must include 'email' and 'password' hashed) and return the inserted document.
    """
    # ensure email uniqueness
    existing = await db[USERS_COL].find_one({'email': user_doc.get('email')})
    if existing:
        # return existing to caller (or raise in route)
        return existing
    res = await db[USERS_COL].insert_one(user_doc)
    created = await db[USERS_COL].find_one({'_id': res.inserted_id})
    return created


async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if not email:
        return None
    doc = await db[USERS_COL].find_one({'email': email})
    return doc


async def get_user_by_id(user_id: ObjectId) -> Optional[Dict[str, Any]]:
    if not user_id:
        return None
    return await db[USERS_COL].find_one({'_id': ObjectId(user_id)})


# -----------------------
# Category helpers
# -----------------------
async def create_category(cat_doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a global category (unique by name + type). If exists, return existing doc.
    cat_doc expected keys: name, type (income|expense), optional icon
    """
    name = cat_doc.get('name')
    typ = cat_doc.get('type')
    if not name or not typ:
        raise ValueError('Category must have name and type')

    existing = await db[CAT_COL].find_one({'name': name, 'type': typ})
    if existing:
        return existing

    insert_doc = {
        'name': name,
        'type': typ,
        'icon': cat_doc.get('icon', ''),
        'created_at': datetime.utcnow()
    }
    res = await db[CAT_COL].insert_one(insert_doc)
    created = await db[CAT_COL].find_one({'_id': res.inserted_id})
    return created


async def list_categories() -> List[Dict[str, Any]]:
    cursor = db[CAT_COL].find({})
    out = []
    async for d in cursor:
        d['id'] = str(d['_id'])
        d.pop('_id', None)
        out.append(d)
    return out


# -----------------------
# Transaction helpers
# -----------------------
async def create_transaction(user_id: ObjectId, tx_doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    tx_doc expected keys: amount, date (datetime), type ('expense'|'income'), category, description/note
    Adds user_id and inserts into transactions collection.
    """
    insert_doc = tx_doc.copy()
    insert_doc['user_id'] = ObjectId(user_id)
    # ensure date is a datetime (caller may pass datetime already)
    if 'date' in insert_doc:
        if isinstance(insert_doc['date'], str) and insert_doc['date']:
            try:
                insert_doc['date'] = datetime.fromisoformat(insert_doc['date'])
            except Exception:
                insert_doc['date'] = datetime.utcnow()
        elif not insert_doc['date']:
            insert_doc['date'] = datetime.utcnow()
    else:
        insert_doc['date'] = datetime.utcnow()

    insert_doc.setdefault('category', insert_doc.get('category', 'uncategorized'))
    insert_doc.setdefault('type', insert_doc.get('type', 'expense'))
    insert_doc.setdefault('amount', float(insert_doc.get('amount', 0) or 0))
    insert_doc['created_at'] = datetime.utcnow()
    res = await db[TRAN_COL].insert_one(insert_doc)
    saved = await db[TRAN_COL].find_one({'_id': res.inserted_id})
    # normalize id and remove user_id for client
    saved['id'] = str(saved['_id'])
    saved.pop('_id', None)
    saved.pop('user_id', None)
    return saved


async def get_transactions(user_id: ObjectId, start: Optional[datetime] = None, end: Optional[datetime] = None,
                           skip: int = 0, limit: int = 10, tx_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Return list of transactions for user, optionally filtered by date range and tx_type.
    Sorted by date DESC (newest first) unless required otherwise.
    """
    query = {'user_id': ObjectId(user_id)}
    if start or end:
        query['date'] = {}
        if start:
            query['date']['$gte'] = start
        if end:
            query['date']['$lte'] = end
    if tx_type:
        # field name in DB is 'type' by this project convention
        query['type'] = tx_type

    cursor = db[TRAN_COL].find(query).sort('date', -1).skip(max(0, skip)).limit(max(0, limit))
    out = []
    async for d in cursor:
        d['id'] = str(d['_id'])
        d.pop('_id', None)
        d.pop('user_id', None)
        out.append(d)
    return out


async def count_transactions(user_id: ObjectId, start: Optional[datetime] = None, end: Optional[datetime] = None,
                             tx_type: Optional[str] = None) -> int:
    query = {'user_id': ObjectId(user_id)}
    if start or end:
        query['date'] = {}
        if start:
            query['date']['$gte'] = start
        if end:
            query['date']['$lte'] = end
    if tx_type:
        query['type'] = tx_type
    return await db[TRAN_COL].count_documents(query)


async def update_transaction(user_id: ObjectId, tx_id: str, update_fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update transaction with tx_id owned by user_id. Returns updated document or raises.
    update_fields keys: amount, date (iso), category, description, type
    """
    print(update_fields)
    if 'date' in update_fields and isinstance(update_fields['date'], str):
        try:
            update_fields['date'] = datetime.fromisoformat(update_fields['date'])
        except:
            update_fields['date'] = None
    # convert numeric amount
    if 'amount' in update_fields:
        try:
            update_fields['amount'] = float(update_fields['amount'])
        except:
            update_fields['amount'] = 0.0

    res = await db[TRAN_COL].update_one({'_id': ObjectId(tx_id), 'user_id': ObjectId(user_id)}, {'$set': update_fields})
    if res.matched_count == 0:
        raise ValueError('Transaction not found or not owned by user')

    updated = await db[TRAN_COL].find_one({'_id': ObjectId(tx_id)})
    if not updated:
        raise ValueError('Failed to fetch updated transaction')
    updated['date'] = update_fields['date']
    updated['amount'] = update_fields['amount']
    updated['category'] = update_fields['category']
    updated['note'] = update_fields['note']
    updated['type'] = update_fields['type']

    updated['id'] = str(updated['_id'])
    updated.pop('_id', None)
    updated.pop('user_id', None)
    return updated


async def delete_transaction(user_id: ObjectId, tx_id: str) -> bool:
    res = await db[TRAN_COL].delete_one({'_id': ObjectId(tx_id), 'user_id': ObjectId(user_id)})
    return res.deleted_count > 0


# -----------------------
# Aggregations
# -----------------------
async def aggregate_by_category(user_id: ObjectId, start: Optional[datetime] = None, end: Optional[datetime] = None,
                                tx_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns a list of { category, total } for the user and optional filters.
    """
    match = {'user_id': ObjectId(user_id)}
    if start or end:
        match['date'] = {}
        if start:
            match['date']['$gte'] = start
        if end:
            match['date']['$lte'] = end
    if tx_type:
        match['type'] = tx_type

    pipeline = [
        {'$match': match},
        {'$group': {'_id': '$category', 'total': {'$sum': '$amount'}}},
        {'$sort': {'total': -1}}
    ]
    cursor = db[TRAN_COL].aggregate(pipeline)
    out = []
    async for d in cursor:
        out.append({'category': d['_id'] or 'unknown', 'total': d.get('total', 0)})
    return out


async def aggregate_by_date(user_id: ObjectId, start: Optional[datetime] = None, end: Optional[datetime] = None,
                            tx_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns a list of { date, total } (date as YYYY-MM-DD) for the user and optional filters.
    """
    match = {'user_id': ObjectId(user_id)}
    if start or end:
        match['date'] = {}
        if start:
            match['date']['$gte'] = start
        if end:
            match['date']['$lte'] = end
    if tx_type:
        match['type'] = tx_type

    pipeline = [
        {'$match': match},
        {'$project': {'amount': 1, 'date': 1, 'day': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$date'}}}},
        {'$group': {'_id': '$day', 'total': {'$sum': '$amount'}}},
        {'$sort': {'_id': 1}}
    ]
    cursor = db[TRAN_COL].aggregate(pipeline)
    out = []
    async for d in cursor:
        out.append({'date': d['_id'], 'total': d.get('total', 0)})
    return out


# -----------------------
# Utility: ensure indexes
# -----------------------
async def ensure_indexes():
    # create useful indexes for performance
    await db[TRAN_COL].create_index([('user_id', 1)])
    await db[TRAN_COL].create_index([('date', -1)])
    await db[TRAN_COL].create_index([('type', 1)])
    await db[USERS_COL].create_index([('email', 1)], unique=True)
    await db[CAT_COL].create_index([('name', 1), ('type', 1)], unique=True)


# call ensure indexes at import time (fire-and-forget)
import asyncio
try:
    asyncio.get_event_loop().create_task(ensure_indexes())
except Exception:
    pass
