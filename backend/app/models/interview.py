from sqlalchemy import Column, String, Text, DateTime
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
    resume_text = Column(Text)
    system_prompt = Column(Text) # The "Brain" context
    
    # Meta
    created_at = Column(DateTime(timezone=True), server_default=func.now())