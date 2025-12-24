import dirtyjson
import re
from groq import Groq
from app.models.interview_sessions import InterviewSession
from app.db import SessionLocal
from app.config import settings 
from app.prompts.report import build_report_prompt
from app.models.session_status import SessionStatus
from app.models.interview_reports import InterviewReport
from app.services.mail_service import MailService
from app.models.users import User
from app.models.interviewer_character import InterviewerCharacter

client = Groq(api_key=settings.GROQ_API_KEY)
mail_service = MailService()

async def generate_and_send_report(session_id: str):
    """
    Generates an interview report using LLM and sends it via email.
    """
    db = SessionLocal()
    try:
        # A. Fetch Session
        interview_session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).with_for_update().first()

        interviewer = db.query(InterviewerCharacter).filter(InterviewerCharacter.id == interview_session.interviewer_id).first()

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
        
        report_prompt = build_report_prompt(
            session=interview_session,
            transcript_text=transcript_text,
            evaluation_prompt=interviewer.evaluation_prompt
        )

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
        
        if not parsed_data:
            print(f"Failed to parse LLM response for {session_id}")
            interview_session.status = SessionStatus.FAILED
            db.commit()
            return
        
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
        user = db.query(User).filter(User.user_id == interview_session.user_id).first()
        if user and user.email:
            try:
                await mail_service.send_interview_report(
                    recipient_email=user.email,
                    job_role=interview_session.job_role,
                    report_markdown=interview_report.feedback_report,
                    score=interview_report.score,
                )
                print(f"Email sent to {user.email}")
            except Exception as mail_err:
                print(f"Mail failed (non-fatal): {mail_err}")
            
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
    Uses dirtyjson to handle the 'almost-JSON' often returned by LLMs.
    """
    if not raw_content or not raw_content.strip():
        return None

    # 1. Remove markdown code fences
    text = raw_content.strip()
    text = re.sub(r"```(?:json|JSON)?\s*", "", text)
    text = re.sub(r"\s*```", "", text)

    try:
        # 2. dirtyjson handles invalid escapes like \' and missing trailing braces
        parsed = dirtyjson.loads(text)
        
        # dirtyjson might return a AttributedDict; convert to standard dict
        if hasattr(parsed, "to_dict"):
            return parsed.to_dict()
        return dict(parsed)
    except Exception as e:
        print(f"parse_llm_json: Final fallback failed: {e}")
        return None