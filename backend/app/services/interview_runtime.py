import asyncio
import json
from fastapi import WebSocket, WebSocketDisconnect
from app.services.voice_service import DeepgramService 
from app.services.ai_service import get_ai_response_stream
from app.domain.interview_state import InterviewStateManager


async def audio_loop(websocket: WebSocket, dg: DeepgramService, connection_state: dict):
    try:
        while True:
            pcm = await websocket.receive_bytes()
            if not dg.assistant_speaking:
                await dg.send_audio(pcm)
    except WebSocketDisconnect:
        connection_state["connected"] = False
    except Exception as e:
        print("AUDIO LOOP ERROR:", e)

async def conversation_loop(
    websocket: WebSocket,
    dg: DeepgramService,
    history: list,
    connection_state: dict
):
    state = InterviewStateManager()
    while not state.over:
        try:
            user_text = await asyncio.wait_for(
                dg.transcript_queue.get(), timeout=1.0
            )
        except asyncio.TimeoutError:
            if state.expired():
                break
            continue

        if len(user_text.strip().split()) < 2:
            continue

        await websocket.send_text(json.dumps({
            "type": "transcript",
            "role": "user",
            "content": user_text
        }))
        history.append({"role": "user", "content": user_text})

        ai_stream = get_ai_response_stream(history)
        full_reply = ""

        dg.assistant_speaking = True
        dg.start_silence_loop()
        
        async for audio, text in dg.text_to_speech_stream(ai_stream):
            await websocket.send_bytes(audio)
            full_reply += text

        await dg.stop_silence_loop()
        dg.assistant_speaking = False

        await websocket.send_text(json.dumps({
            "type": "transcript",
            "role": "assistant",
            "content": full_reply
        }))
        history.append({"role": "assistant", "content": full_reply})

        if "[END_INTERVIEW]" in full_reply:
            state.over = True
            connection_state["connected"] = False
            break


async def send_greeting(websocket: WebSocket, dg: DeepgramService, greeting: str, history: list):
    await websocket.send_text(json.dumps({
        "type": "transcript",
        "role": "assistant",
        "content": greeting
    }))

    async def single_text_stream():
        yield greeting

    dg.assistant_speaking = True
    dg.start_silence_loop()
    async for audio, _ in dg.text_to_speech_stream(single_text_stream()):
        await websocket.send_bytes(audio)
    dg.assistant_speaking = False
    await dg.stop_silence_loop()

    history.append({"role": "assistant", "content": greeting})
