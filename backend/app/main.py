from fastapi import FastAPI
from .routes import router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Personal Finance Assistant API")
app.include_router(router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Personal Finance Assistant API"}
