from app.db import SessionLocal
from app.models.interview import InterviewSession

def finalize_interview(session_id: str, history: list):
    db = SessionLocal()
    try:
        session = (
            db.query(InterviewSession)
            .filter(InterviewSession.session_id == session_id)
            .first()
        )
        if not session:
            print("Finalize failed: session not found")
            return

        clean = [m for m in history if m["role"] in ("user", "assistant")]
        session.transcript = clean
        session.status = "PENDING_REPORT"
        db.commit()

        print(f"Interview {session_id} finalized. Transcript saved.")

    except Exception as e:
        db.rollback()
        print("Finalize interview error:", e)
    finally:
        db.close()
