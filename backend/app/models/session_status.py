from enum import Enum

class SessionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PENDING_REPORT = "PENDING_REPORT"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
