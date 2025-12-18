import json
import os
import re
from groq import Groq
# from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.models.interview import InterviewSession
from app.db import SessionLocal
from app.config import settings 
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

client = Groq(api_key=settings.GROQ_API_KEY)

async def generate_and_send_report(session_id: str):
    """
    Independent task: Creates its own DB session
    """
    db = SessionLocal()
    try:
        # A. Fetch Session
        session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
        
        if not session or not session.transcript:
            print(f"Skipping report: No session or transcript for {session_id}")
            return

        # 1. Sanitize Transcript    
        clean_transcript = []
        if isinstance(session.transcript, list):
            for msg in session.transcript:
                # Ensure content is not None
                content = msg.get("content", "")
                role = msg.get("role", "unknown")
                if content and role in ["user", "assistant"]:
                    clean_transcript.append(f"{role.upper()}: {content}")
        
        transcript_text = "\n".join(clean_transcript)

        # 2. VALIDATION CHECK (Crucial Fix)
        if not transcript_text.strip():
            print("Transcript text is empty after cleaning. Cannot generate report.")
            # Set a fallback status so we know it failed
            session.status = "FAILED_EMPTY_TRANSCRIPT"
            db.commit()
            return

        print(f"Generating report for {session_id} with {len(transcript_text)} chars...")

        # 3. Generate Feedback (The "Brain")
        print(f"Generating report for {session_id}...")
        
        report_prompt = build_report_prompt(session, transcript_text)

        # 4. Call LLM to generate report
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=[{"role": "user", "content": report_prompt}],
            temperature=0.5
        )
        raw_response = completion.choices[0].message.content
        parsed_data = parse_llm_json(raw_response)

        if not parsed_data:
            session.status = "FAILED_REPORT_PARSE"
            db.commit()
            return
        
        # Extract score (Simple heuristic, or you can ask LLM to output JSON)
        # For now, we save the text report.
        
        # C. Save to DB
        try:
            session.feedback_report = parsed_data.get("report_markdown")
            session.score = parsed_data.get("score")
            session.status = "COMPLETED"
            db.commit()
        except Exception:
            db.rollback()
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
        db.rollback()
        print(f"Error generating report: {e}")
    finally:
        print("Completed the report")
        db.close()

def parse_llm_json(raw_content: str):
    """
    Cleans and parses JSON from LLM output, handling markdown blocks if present.
    """
    try:
        # 1. Remove markdown code blocks if the LLM included them
        clean_content = re.sub(r"```json\s*|\s*```", "", raw_content).strip()
        return json.loads(clean_content)
    except json.JSONDecodeError:
        # Fallback: try to find anything that looks like a JSON object
        match = re.search(r"\{.*\}", clean_content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
        return None