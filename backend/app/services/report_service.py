import json
import re
from groq import Groq
# from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.models.interview_sessions import InterviewSession
from app.db import SessionLocal
from app.config import settings 
from app.prompts.report import build_report_prompt
from app.models.session_status import SessionStatus
from app.models.interview_reports import InterviewReport

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

client = Groq(api_key=settings.GROQ_API_KEY)

async def generate_and_send_report(session_id: str):
    """
    Independent task: Creates its own DB session
    """
    db = SessionLocal()
    try:
        # A. Fetch Session
        interview_session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).with_for_update().first()

        if not interview_session:
            print(f"No session found for {session_id}")
            return
        if interview_session.status in [SessionStatus.COMPLETED, SessionStatus.FAILED]:
            print(f"Session {session_id} already {interview_session.status.value}, skipping")
            return
        
        interview_report = db.query(InterviewReport).filter(InterviewReport.session_id == session_id).first()

        if not interview_report:
            interview_report = InterviewReport(session_id=session_id)
            db.add(interview_report)
            db.flush()

        # 1. Sanitize Transcript    
        clean_transcript = []
        if isinstance(interview_session.transcript, list):
            for msg in interview_session.transcript:
                # Ensure content is not None
                content = msg.get("content", "")
                role = msg.get("role", "unknown")
                if content and content.strip() and role in ["user", "assistant"]:
                    speaker = "INTERVIEWER" if role == "assistant" else "CANDIDATE"
                    clean_transcript.append(f"{speaker}: {content.strip()}")
        
        transcript_text = "\n\n".join(clean_transcript)

        # 2. VALIDATION CHECK (Crucial Fix)
        if not transcript_text.strip():
            print(f"Empty transcript after cleaning for {session_id}")
            # Set a fallback status so we know it failed
            interview_session.status = SessionStatus.FAILED
            db.commit()
            return
        
        if len(clean_transcript) < 3:
            print(f"Very short transcript ({len(clean_transcript)} messages) for {session_id}")

        # 3. Generate Feedback (The "Brain")
        print(f"Generating report for {session_id}")
        print(f"Transcript: {len(transcript_text)} chars, {len(clean_transcript)} messages")
        
        report_prompt = build_report_prompt(interview_session, transcript_text)

        # 4. Call LLM to generate report
        try: 
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile", 
                messages=[{"role": "user", "content": report_prompt}],
                temperature=0.4
            )
            raw_response = completion.choices[0].message.content
        except Exception as e:
            print(f"Groq API error: {e}")
            interview_session.status = SessionStatus.FAILED
            db.commit()
            return
        
        # 5. Parse JSON response
        parsed_data = parse_llm_json(raw_response)
        
        # Extract score (Simple heuristic, or you can ask LLM to output JSON)
        # For now, we save the text report.
        
        # C. Save to DB
        try:
            report = parsed_data.get("report_markdown", "").strip()
            score = parsed_data.get("score")
            interview_report.feedback_report = report
            interview_report.score = score
            interview_session.status = SessionStatus.COMPLETED
            db.commit()
            print(f"Report saved successfully for {session_id}")
        except Exception as e:
            print(f"Database error while saving report: {e}")
            db.rollback()
            interview_session.status = SessionStatus.FAILED
            db.commit()
            raise
        
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
        print(f"Unexpected error generating report for {session_id}: {e}")
        db.rollback()
        try:
            if interview_session:
                interview_session.status = SessionStatus.FAILED
                db.commit()
        except:
            pass
    finally:
        db.close()
        print(f"Report generation completed for {session_id}")

def parse_llm_json(raw_content: str):
    """
    Cleans and parses JSON from LLM output, handling various edge cases.
    """
    if not raw_content or not raw_content.strip():
        print("Empty raw content")
        return None
    
    # 1. Remove markdown code blocks
    clean_content = re.sub(r"```(?:json)?\s*", "", raw_content)
    clean_content = re.sub(r"```\s*$", "", clean_content)
    clean_content = clean_content.strip()
    
    # 2. Try direct parsing first
    try:
        return json.loads(clean_content)
    except json.JSONDecodeError as e:
        print(f"Direct JSON parse failed: {e}")
    
    # 3. Try to extract JSON object using regex
    json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', clean_content, re.DOTALL)
    if json_match:
        try:
            extracted = json_match.group()
            return json.loads(extracted)
        except json.JSONDecodeError as e:
            print(f"Extracted JSON parse failed: {e}")
    return None