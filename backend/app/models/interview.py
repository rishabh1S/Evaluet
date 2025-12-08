from sqlalchemy import JSON, Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.db import Base

class InterviewSession(Base):
    __tablename__ = "interviews"

    # Primary Key
    session_id = Column(String, primary_key=True, index=True)
    
    # User Details
    user_id = Column(String, index=True)
    
    # Job Details
    job_role = Column(String)
    job_description = Column(Text)
    candidate_level = Column(String)
    
    # Context
    system_prompt = Column(Text) # The "Brain" context
    
    # --- NEW FIELDS ---
    # Stores the full conversation [{"role": "user", "content": "..."}, ...]
    # using JSON type (Requires PostgreSQL/NeonDB)
    transcript = Column(JSON, nullable=True) 
    
    # Stores the AI generated feedback (Markdown text)
    feedback_report = Column(Text, nullable=True)
    
    # Stores a numerical score (1-10)
    score = Column(Integer, nullable=True)
    
    # Status: 'ACTIVE', 'COMPLETED', 'ABANDONED'
    status = Column(String, default="ACTIVE")
    
    # Meta
    created_at = Column(DateTime(timezone=True), server_default=func.now())