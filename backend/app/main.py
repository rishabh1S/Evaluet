from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import interview as interview_router
from app.routers import websocket as websocket_router
from app.db import engine, Base
from app.models import interview

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Evaluet API")

# --- CORS CONFIGURATION (ADD THIS BLOCK) ---
app.add_middleware(
    CORSMiddleware,
    # In production, specify exact domain: ["https://myapp.com"]
    # For dev, "*" allows localhost:5500, localhost:3000, etc.
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], # Allows GET, POST, PUT, DELETE, etc.
    allow_headers=["*"], # Allows all headers
)
# -------------------------------------------

# Include Routers
app.include_router(interview_router.router, prefix="/api/interview", tags=["Interview"])
app.include_router(websocket_router.router, prefix="/ws", tags=["WebSocket"])

@app.get("/")
def health_check():
    return {"status": "running", "service": "Evaluet Backend"}