import json
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

client = Groq(api_key=settings.GROQ_API_KEY)
mail_service = MailService()

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
        # ---- Send Email (NON-BLOCKING FAILURE) ----
        user = db.query(User).filter(User.user_id == interview_session.user_id).first()
        # if user and user.email:
        #     try:
        #         await mail_service.send_interview_report(
        #             recipient_email=user.email,
        #             job_role=interview_session.job_role,
        #             report_markdown=interview_report.feedback_report,
        #             score=interview_report.score,
        #         )
        #         print(f"Email sent to {user.email}")
        #     except Exception as mail_err:
        #         print(f"Mail failed (non-fatal): {mail_err}")
            
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
        print("parse_llm_json: empty LLM response")
        return None

    text = raw_content.strip()

    # --------------------------------------------------
    # 1. Remove markdown code fences if present
    # --------------------------------------------------
    # Removes ```json, ```JSON, ``` and closing ```
    text = re.sub(r"```(?:json|JSON)?\s*", "", text)
    text = re.sub(r"\s*```", "", text)

    # --------------------------------------------------
    # 2. Fast path: try parsing whole content
    # --------------------------------------------------
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass  # expected for most LLM outputs

    # --------------------------------------------------
    # 3. Extract FIRST valid JSON object using stack parsing
    # --------------------------------------------------
    start = text.find("{")
    if start == -1:
        print("parse_llm_json: no '{' found")
        return None

    brace_count = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            brace_count += 1
        elif text[i] == "}":
            brace_count -= 1

        if brace_count == 0:
            candidate = text[start : i + 1]
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError as e:
                print(f"parse_llm_json: extracted JSON invalid: {e}")
                return None

    print("parse_llm_json: unmatched braces, invalid JSON")
    return None
    