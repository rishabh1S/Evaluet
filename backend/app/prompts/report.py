from app.models.interview import InterviewSession

def build_report_prompt(session: InterviewSession, transcript_text: str) -> str:
    """
    Constructs the prompt for generating the interview feedback report.
    FIXED: Added missing return statement.
    """
    return f"""
    Analyze the following technical interview transcript for a {session.candidate_level} {session.job_role} role.

    TRANSCRIPT:
    {transcript_text}

    TASK:
    Generate a structured feedback report in Markdown format with the following sections:
    1. **Overall Score**: Give a score out of 10 based on technical knowledge, communication, and job fit.
    2. **Strengths**: List 3 specific strengths demonstrated by the candidate. Be concrete and reference actual responses.
    3. **Weaknesses**: List 3 specific areas for improvement. Be constructive and specific.
    4. **Technical Assessment**: 
    - Evaluate technical accuracy of answers
    - Assess depth of knowledge
    - Comment on problem-solving approach
    5. **Communication Skills**:
    - Clarity and structure of responses
    - Ability to explain complex concepts
    - Professional demeanor
    6. **Job Fit Analysis**:
    - How well the candidate's experience aligns with the role
    - Relevant skills demonstrated
    - Potential growth areas
    7. **Recommendation**: Provide one of the following:
    - **Strong Hire**: Exceptional candidate, highly recommended
    - **Hire**: Good candidate, meets requirements
    - **Maybe**: Has potential but needs development
    - **No Hire**: Does not meet requirements at this time

    IMPORTANT: Be specific and reference actual answers from the transcript. Avoid generic feedback.
    OUTPUT FORMAT:
    You must return ONLY a JSON object. Do not include any introductory text or markdown code blocks (like ```json).
    
    Structure:
    {{
        "score": <integer>,
        "report_markdown": "<full structured report in markdown format content here>"
    }}

    """
