from app.models.interview_sessions import InterviewSession

def build_report_prompt(session: InterviewSession, transcript_text: str) -> str:
    """
    Robust report-generation prompt.
    Designed to NEVER break JSON parsing.
    """

    return f"""
    You are a senior interviewer generating a hiring feedback report.

    ROLE:
    Candidate interviewed for a {session.candidate_level} {session.job_role} position.

    TRANSCRIPT (verbatim):
    {transcript_text}

    TASK:
    Generate a structured hiring evaluation based ONLY on the transcript.
    Do NOT invent information.
    If something is unclear, state it explicitly.

    OUTPUT REQUIREMENTS (CRITICAL):
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

    REPORT CONTENT (inside report_markdown):
    Include the following sections in Markdown:

    ## Overall Score
    Explain the score briefly.

    ## Strengths
    List 2–3 specific strengths with references to answers.

    ## Weaknesses
    List 2–3 concrete improvement areas.

    ## Technical Assessment
    Evaluate accuracy, depth, and problem-solving.

    ## Communication Skills
    Assess clarity, structure, and articulation.

    ## Job Fit Analysis
    Alignment with role requirements and growth potential.

    ## Recommendation
    Choose ONE:
    - Strong Hire
    - Hire
    - Maybe
    - No Hire

    IMPORTANT:
    - Be concise
    - Be specific
    - Avoid generic statements
    """
