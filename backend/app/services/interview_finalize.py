from app.db import SessionLocal
from app.repository.interview_repository import persist_session

def finalize_interview(session_id: str, history: list):
    db = SessionLocal()
    try:
        success = persist_session(db, session_id, history)
        if success:
            print(f"Interview {session_id} finalized.")
        else:
            print("Finalize failed: session not found")
    except Exception as e:
        db.rollback()
        print("Finalize interview error:", e)
    finally:
        db.close()
