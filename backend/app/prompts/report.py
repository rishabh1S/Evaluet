import json
from app.models.interview import InterviewSession


def build_report_prompt(session:InterviewSession) -> str:
    """
    Constructs the system prompt for the AI Interviewer.
    """
    f"""
    Analyze the following technical interview transcript for a {session.candidate_level} {session.job_role} role.
    
    TRANSCRIPT:
    {json.dumps(session.transcript)}
    
    TASK:
    Generate a structured feedback report in Markdown format.
    1. **Score**: Give a score out of 10.
    2. **Strengths**: 3 bullet points.
    3. **Weaknesses**: 3 bullet points.
    4. **Detailed Feedback**: Analysis of technical accuracy and communication.
    5. **Recommendation**: Hire / No Hire / Strong Hire.
    
    Do not be generic. Be specific to the answers given.
    """