import os
from groq import Groq
# from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.models.interview import InterviewSession
from app.db import SessionLocal
from app.prompts.report import build_report_prompt

# 1. Email Configuration
# email_conf = ConnectionConfig(
#     MAIL_USERNAME=os.getenv("MAIL_USERNAME"), # e.g., your_email@gmail.com
#     MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"), # App Password (Not login password)
#     MAIL_FROM=os.getenv("MAIL_FROM", "noreply@verbalize.ai"),
#     MAIL_PORT=587,
#     MAIL_SERVER="smtp.gmail.com",
#     MAIL_STARTTLS=True,
#     MAIL_SSL_TLS=False,
#     USE_CREDENTIALS=True,
#     VALIDATE_CERTS=True
# )

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

async def generate_and_send_report(session_id: str):
    """
    Independent task: Creates its own DB session
    """
    db = SessionLocal()
    
    # A. Fetch Session
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    
    if not session:
        print(f"Session {session_id} not found.")
        return

    if not session.transcript:
        print(f"Transcript is empty for session {session_id}. Skipping report.")
            # Mark as abandoned
        session.status = "ABANDONED"
        db.commit()
        return
            
        # Ensure transcript is not just an empty list in JSON
    if isinstance(session.transcript, list) and len(session.transcript) == 0:
        print("Transcript list is empty. Skipping report.")
        return

    # B. Generate Feedback (The "Brain")
    print(f"Generating report for {session_id}...")
    
    report_prompt = build_report_prompt(session)

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", # More powerful model for report generation
            messages=[{"role": "user", "content": report_prompt}],
            temperature=0.5
        )
        report_content = completion.choices[0].message.content
        
        # Extract score (Simple heuristic, or you can ask LLM to output JSON)
        # For now, we save the text report.
        
        # C. Save to DB
        session.feedback_report = report_content
        session.status = "COMPLETED"
        db.commit()
        
        # D. Send Email
        # Assuming 'user_id' is an email for MVP. If it's an ID, you need a User table to lookup email.
        # Let's assume user_id passed from frontend IS the email for now.
        # if "@" in session.user_id: 
        #     message = MessageSchema(
        #         subject=f"Your Interview Report: {session.job_role}",
        #         recipients=[session.user_id],
        #         body=report_content,
        #         subtype=MessageType.html
        #     )
        #     fm = FastMail(email_conf)
        #     await fm.send_message(message)
        #     print(f"Email sent to {session.user_id}")
            
    except Exception as e:
        print(f"Error generating report: {e}")
    finally:
        db.close()