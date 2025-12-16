def classify_interrupt_intent(text: str) -> bool:
    """
    Returns True if user is trying to interrupt the assistant.
    Must be FAST and conservative.
    """
    t = text.lower().strip()

    # 1. Ignore filler acknowledgements
    if t in {"yeah", "yes", "right", "okay", "ok", "uh-huh", "mm-hmm"}:
        return False

    # 2. Very short + imperative → interrupt
    if len(t.split()) <= 4:
            return True

    # 3. Discourse markers (not hard-coded phrases)
    interrupt_markers = (
        "wait", "hold", "stop", "sorry", "actually",
        "but", "so", "no", "listen"
    )

    if any(t.startswith(m) for m in interrupt_markers):
        return True

    # 4. Turn-taking verbs
    turn_verbs = ("let me", "can i", "i want to", "i need to")

    if any(v in t for v in turn_verbs):
        return True

    return False
