from groq import Groq
from typing import AsyncGenerator
from app.config import settings 

client = Groq(api_key=settings.GROQ_API_KEY)

async def get_ai_response_stream(history: list) -> AsyncGenerator[str, None]:
    """
    Streams text chunks from Groq.
    Yields: "Hello", " ", "there", ...
    """
    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant", 
            messages=history,
            temperature=0.5,
            max_tokens=120,
            stream=True 
        )

        for chunk in completion:
            if chunk.choices[0].delta.content:
                print(f'Groq chunk: "{chunk.choices[0].delta.content}"')
                yield chunk.choices[0].delta.content

    except Exception as e:
        print(f"Groq Error: {e}")
        yield "I am having trouble thinking right now."