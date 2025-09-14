from fastapi import FastAPI
from .routes import router
from fastapi.middleware.cors import CORSMiddleware
from .db import get_client
app = FastAPI(title='Personal Finance Assistant API')
app.include_router(router, prefix='/api')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
@app.on_event('startup')
async def startup_db_client():
    client = get_client()
    try:
        await client.admin.command('ping')
        print('✅ Connected to MongoDB successfully')
    except Exception as e:
        print('❌ Could not connect to MongoDB:', e)
@app.get('/')
async def root():
    return {'status':'ok', 'message':'Personal Finance Assistant API'}
