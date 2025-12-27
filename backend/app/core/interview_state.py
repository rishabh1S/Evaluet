import time

class InterviewStateManager:
    def __init__(self, minutes=20):
        self.start = time.time()
        self.limit = minutes * 60
        self.over = False
        self.timeout_triggered = False

    def expired(self):
        if not self.timeout_triggered and time.time() - self.start > self.limit:
            self.timeout_triggered = True
            return True
        return False
