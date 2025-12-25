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
    - Do NOT insert standalone punctuation or filler lines (e.g., ".", "-", or empty bullet points).
    - Paragraph separation MUST be done using a single "\n\n" only.
    - Never add content solely to preserve formatting.
    - Use double quotes for JSON keys and string values.
    - NO explanations outside JSON.

    ═══════════════════════════════════════════════════════════
    REPORT STRUCTURE (MANDATORY):
    ═══════════════════════════════════════════════════════════
    - Use ONLY the following sections in this exact order:
    1. Candidate Summary
    2. Technical Evaluation
    3. Strengths (bullet points only)
    4. Weaknesses (bullet points only)
    5. Hiring Decision (Strong Hire, Hire, Maybe, No Hire)
    6. Final Recommendation (detailed reasoning for hiring decision)
    - Do NOT add extra sections
    - Do NOT add filler lines


    JSON STRUCTURE (MANDATORY):
    {{
    "score": <integer from 1 to 10>,
    "report_markdown": "## Candidate Summary\n...\n\n## Technical Evaluation\n...\n\n## Strengths\n- ...\n\n## Weaknesses\n- ...\n\n## Hiring Decision\n...\n\n## Final Recommendation\n..."
    }}
    """
