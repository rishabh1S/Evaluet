import time

class InterviewStateManager:
    def __init__(self, minutes=20):
        self.start = time.time()
        self.limit = minutes * 60
        self.over = False

    def expired(self):
        if not self.over and time.time() - self.start > self.limit:
            self.over = True
            return True
        return False