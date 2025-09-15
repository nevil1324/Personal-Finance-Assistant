from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "pfa_db")
client: AsyncIOMotorClient | None = None

def get_client():
    global client
    if client is None:
        client = AsyncIOMotorClient(MONGO_URI)
    return client

def get_db():
    return get_client()[DB_NAME]
