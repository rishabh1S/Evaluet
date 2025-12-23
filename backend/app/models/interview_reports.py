from sqlalchemy import Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.db import Base
from sqlalchemy.orm import relationship

class InterviewReport(Base):
    __tablename__ = "interview_reports"

    report_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(
        String,
        ForeignKey("interview_sessions.session_id"),
        unique=True,  # 1 report per session (for now)
        index=True
    )

    feedback_report = Column(Text)  # Markdown
    score = Column(Integer)         # 1–10

    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship(
        "InterviewSession",
        back_populates="report"
    )
