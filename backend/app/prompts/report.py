from app.models.interview_sessions import InterviewSession

def build_report_prompt(session: InterviewSession, transcript_text: str, evaluation_prompt: str) -> str:
    """
    Robust report-generation prompt.
    Designed to NEVER break JSON parsing.
    """

    return f"""
    {evaluation_prompt}
    ═══════════════════════════════════════════════════════════
    INTERVIEW CONTEXT
    ═══════════════════════════════════════════════════════════
    Role: {session.candidate_level} 
    Level: {session.job_role} position.

    ═══════════════════════════════════════════════════════════
    TRANSCRIPT (VERBATIM)
    ═══════════════════════════════════════════════════════════
    {transcript_text}

    TASK:
    Generate a structured hiring evaluation based ONLY on the transcript.
    Do NOT invent information.
    If something is unclear, state it explicitly.

    ═══════════════════════════════════════════════════════════
    OUTPUT REQUIREMENTS (CRITICAL)
    ═══════════════════════════════════════════════════════════
    - Return ONLY a valid JSON object.
    - DO NOT escape single quotes (e.g., use "candidate's" NOT "candidate\'s").
    - ALL newline characters inside the "report_markdown" string MUST be written as literal \n.
    - Ensure the entire JSON is on a single line if possible, or properly escaped.
    - Use double quotes for JSON keys and string values.
    - NO explanations outside JSON

    JSON STRUCTURE (MANDATORY):
    {{
    "score": <integer from 1 to 10>,
    "report_markdown": "<complete markdown report>"
    }}
    """
