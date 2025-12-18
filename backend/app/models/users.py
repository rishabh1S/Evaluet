from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.db import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
