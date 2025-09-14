from .db import get_db
from bson.objectid import ObjectId
from datetime import datetime
from typing import Optional, List, Dict, Any
USERS = "users"
CAT = "categories"
COL = "transactions"
async def create_user(user_dict: dict):
    db = get_db()
    res = await db[USERS].insert_one(user_dict)
    user_dict['_id'] = res.inserted_id
    return user_dict
async def get_user_by_email(email: str):
    db = get_db()
    return await db[USERS].find_one({'email': email})
async def create_category(cat: dict):
    db = get_db()
    res = await db[CAT].insert_one(cat)
    cat['_id'] = res.inserted_id
    return cat
async def list_categories(user_id) -> List[Dict[str,Any]]:
    db = get_db()
    cursor = db[CAT].find({'user_id': user_id})
    out = []
    async for d in cursor:
        out.append({'id': str(d['_id']), 'name': d['name'], 'type': d['type']})
    return out
async def create_transaction(user_id, doc: dict) -> dict:
    db = get_db()
    doc['user_id'] = user_id
    if 'date' not in doc or doc['date'] is None:
        doc['date'] = datetime.utcnow()
    res = await db[COL].insert_one(doc)
    doc['_id'] = res.inserted_id
    return doc
async def count_transactions(user_id, start: Optional[datetime]=None, end: Optional[datetime]=None, tx_type:Optional[str]=None):
    db = get_db()
    q = {'user_id': user_id}
    if start or end:
        q['date'] = {}
        if start: q['date']['$gte'] = start
        if end: q['date']['$lte'] = end
    if tx_type: q['type'] = tx_type
    return await db[COL].count_documents(q)
async def get_transactions(user_id, start: Optional[datetime]=None, end: Optional[datetime]=None, skip:int=0, limit:int=50, tx_type:Optional[str]=None):
    db = get_db()
    query = {'user_id': user_id}
    if start or end:
        query['date'] = {}
        if start: query['date']['$gte'] = start
        if end: query['date']['$lte'] = end
    if tx_type:
        query['type'] = tx_type
    cursor = db[COL].find(query).sort('date', -1).skip(skip).limit(limit)
    docs = []
    async for d in cursor:
        d['id'] = str(d['_id'])
        d.pop('_id', None)
        d.pop('user_id', None)
        docs.append(d)
    return docs
async def aggregate_by_category(user_id, start:Optional[datetime]=None, end:Optional[datetime]=None, tx_type:Optional[str]=None):
    db = get_db()
    match = {'user_id': user_id}
    if start or end:
        match['date'] = {}
        if start: match['date']['$gte'] = start
        if end: match['date']['$lte'] = end
    if tx_type:
        match['type'] = tx_type
    pipeline = [
        {'$match': match},
        {'$group': {'_id': '$category', 'total': {'$sum': '$amount'}}},
        {'$sort': {'total': -1}}
    ]
    cursor = db[COL].aggregate(pipeline)
    out = []
    async for d in cursor:
        out.append({'category': d['_id'], 'total': d['total']})
    return out
async def aggregate_by_date(user_id, start:Optional[datetime]=None, end:Optional[datetime]=None):
    db = get_db()
    match = {'user_id': user_id}
    if start or end:
        match['date'] = {}
        if start: match['date']['$gte'] = start
        if end: match['date']['$lte'] = end
    pipeline = [
        {'$match': match},
        {'$project': {'amount': 1, 'date': 1, 'day': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$date'}}}},
        {'$group': {'_id': '$day', 'total': {'$sum': '$amount'}}},
        {'$sort': {'_id': 1}}
    ]
    cursor = db[COL].aggregate(pipeline)
    out = []
    async for d in cursor:
        out.append({'date': d['_id'], 'total': d['total']})
    return out
