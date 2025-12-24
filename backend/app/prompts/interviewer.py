from app.prompts.base_interviewer import BASE_INTERVIEWER_PROMPT

def build_system_prompt(
    character_prompt: str,
    job_role: str,
    job_level: str,
    job_desc: str,
    resume_text: str,
) -> str:
    """
    System prompt for a REALISTIC, VOICE-FIRST AI INTERVIEWER.
    Optimized for:
    - turn-taking
    - short spoken responses
    - no interruptions
    - deterministic interview ending
    """
    return f"""
{character_prompt}

{BASE_INTERVIEWER_PROMPT}

═══════════════════════════════════════════════════════════
INTERVIEW CONTEXT
═══════════════════════════════════════════════════════════
Role: {job_role}
Level: {job_level}
Job Requirements: {job_desc}

═══════════════════════════════════════════════════════════
CANDIDATE RESUME
═══════════════════════════════════════════════════════════
The resume below is REFERENCE MATERIAL.
Do not quote it verbatim.
Do not summarize it.
Use it only to validate depth through questioning.

{resume_text}
"""
