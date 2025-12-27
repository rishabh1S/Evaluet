import re

END_TOKEN = "[END_INTERVIEW]"
PLACEHOLDER = "__END_INTERVIEW__"

def sanitize_llm_output(text: str) -> str:
    if not text:
        return text

    # Preserve END_INTERVIEW
    text = text.replace(END_TOKEN, PLACEHOLDER)

    # Remove (...) including content
    text = re.sub(r"\([^)]*\)", "", text)

    # Remove [...] including content
    text = re.sub(r"\[[^\]]*\]", "", text)

    # Remove {...} including content
    text = re.sub(r"\{[^}]*\}", "", text)

    # Remove <...> including content
    text = re.sub(r"<[^>]*>", "", text)

    # Remove *...* including content
    text = re.sub(r"\*[^*]*\*", "", text)

    # Remove leftover unmatched symbols
    text = re.sub(r"[\[\]\(\)\{\}\*<>]", "", text)

    # Restore END_INTERVIEW
    text = text.replace(PLACEHOLDER, END_TOKEN)

    # Normalize whitespace
    text = re.sub(r"\s{2,}", " ", text)

    return text.strip()
