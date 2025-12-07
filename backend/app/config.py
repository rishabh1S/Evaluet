import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "Evaluet Backend"
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY")
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY")

settings = Settings()