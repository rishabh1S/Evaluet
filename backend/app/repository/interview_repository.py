from sqlalchemy.orm import Session
from app.models.interview import InterviewSession

def load_session(db: Session, session_id: str):
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.session_id == session_id)
        .first()
    )
    return session

def persist_session(db: Session, session_data: InterviewSession, history: list):
    clean = [m for m in history if m["role"] in ("user", "assistant")]
    session_data.transcript = clean
    session_data.status = "PENDING_REPORT"
    db.commit()