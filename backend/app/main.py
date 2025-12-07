from fastapi import FastAPI
from app.routers import interview as interview_router
from app.db import engine, Base
from app.models import interview as interview_model

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Evaluet API")

# Include Routers
app.include_router(interview_router.router, prefix="/api/interview", tags=["Interview"])

@app.get("/")
def health_check():
    return {"status": "running", "service": "Evaluet Backend"}