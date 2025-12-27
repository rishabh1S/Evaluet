from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.db import Base

class InterviewerCharacter(Base):
    __tablename__ = "interviewer_characters"

    id = Column(String, primary_key=True)  # "sarah", "marcus", "elena"
    name = Column(String, nullable=False)
    description = Column(Text)
    voice_model = Column(String, nullable=False)

    behavior_prompt = Column(Text, nullable=False)
    evaluation_prompt = Column(Text, nullable=False)
    focus_areas = Column(Text)

    profile_image_url = Column(String)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
