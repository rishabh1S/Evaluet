import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db                
from app.models.interview_sessions import InterviewSession 
from app.services.pdf_service import extract_text_from_pdf
from app.prompts.interviewer import build_system_prompt
from app.models.users import User

router = APIRouter()

@router.post("/init")
async def init_interview(
    resume: UploadFile = File(...),
    job_desc: str = Form(...),
    job_level: str = Form(...),
    job_role: str = Form(...),
    user_id: str = Form(...),
    db: Session = Depends(get_db)
):
    # 1. Read and Parse PDF
    try:
        content = await resume.read()
        resume_text = extract_text_from_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading PDF: {str(e)}")
    
    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    # 2. Construct the System Prompt (The "Brain")
    # This guides the AI on how to behave during the WebSocket session
    system_prompt = build_system_prompt(
        resume_text=resume_text,
        job_desc=job_desc,
        job_level=job_level,
        job_role=job_role
    )

    # User validation
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 3. Save Session to DB
    session_id = str(uuid.uuid4())

    new_session = InterviewSession(
        session_id=session_id,
        user_id=user_id,
        job_role=job_role,
        job_description=job_desc,
        candidate_level=job_level,
        system_prompt=system_prompt
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "session_id": session_id,
        "message": "Interview initialized successfully",
        "ws_url": f"/ws/interview/{session_id}" 
    }