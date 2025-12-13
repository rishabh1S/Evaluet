import time
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.interview import InterviewSession
from app.services.voice_service import DeepgramService   # <-- new one
from app.services.ai_service import get_ai_response_stream
from app.services.report_service import generate_and_send_report

router = APIRouter()


class InterviewStateManager:
    def __init__(self, minutes=15):
        self.start = time.time()
        self.limit = minutes * 60
        self.over = False

    def expired(self):
        if not self.over and time.time() - self.start > self.limit:
            self.over = True
            return True
        return False


@router.websocket("/interview/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, db: Session = Depends(get_db)):
    await websocket.accept()

    # ----------------------
    # LOAD SESSION
    # ----------------------
    session_data = (
        db.query(InterviewSession)
        .filter(InterviewSession.session_id == session_id)
        .first()
    )
    if not session_data:
        await websocket.close(code=1008, reason="Invalid session")
        return

    # ----------------------
    # START DEEPGRAM FLUX
    # ----------------------
    dg = DeepgramService()
    if not await dg.start():
        await websocket.close(code=1011, reason="Deepgram connection failed")
        return

    state = InterviewStateManager()
    history = [{"role": "system", "content": session_data.system_prompt}]

    # ----------------------
    # SEND INITIAL GREETING
    # ----------------------
    greeting = f"Hello! You're applying for {session_data.job_role}. Please introduce yourself."

    await websocket.send_text(json.dumps({
        "type": "transcript",
        "role": "assistant",
        "content": greeting
    }))

    async def single_text_stream(text: str):
        yield text

    dg.assistant_speaking = True
    dg.start_silence_loop()
    async for audio, _ in dg.text_to_speech_stream(single_text_stream(greeting)):
        await websocket.send_bytes(audio)
    dg.assistant_speaking = False
    await dg.stop_silence_loop()

    history.append({"role": "assistant", "content": greeting})

    # ----------------------
    # AUDIO LOOP (CLIENT → FLUX)
    # ----------------------
    async def audio_loop():
        while True:
            try:
                pcm = await websocket.receive_bytes()
                if not dg.assistant_speaking:
                    await dg.send_audio(pcm)
            except WebSocketDisconnect:
                break
            except Exception as e:
                print("AUDIO LOOP ERROR:", e)

    # ----------------------
    # CONVERSATION LOOP (FLUX → LLM → TTS)
    # ----------------------
    async def convo_loop():
        while not state.over:
            try:
                # Wait for EndOfTurn text from Flux
                user_text = await asyncio.wait_for(dg.transcript_queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                if state.expired():
                    user_text = "(time expired)"
                else:
                    continue

            # Ignore super-short junk
            if len(user_text.strip().split()) < 2:
                continue

            print("[USER TURN]", user_text)

            await websocket.send_text(json.dumps({
                "type": "transcript",
                "role": "user",
                "content": user_text
            }))
            history.append({"role": "user", "content": user_text})

            # ----------------------
            # GET LLM RESPONSE
            # ----------------------
            ai_stream = get_ai_response_stream(history)
            full_reply = ""

            dg.assistant_speaking = True
            dg.start_silence_loop()
            async for audio, text_segment in dg.text_to_speech_stream(ai_stream):
                await websocket.send_bytes(audio)
                full_reply += text_segment
            dg.assistant_speaking = False
            await dg.stop_silence_loop()

            await websocket.send_text(json.dumps({
                "type": "transcript",
                "role": "assistant",
                "content": full_reply
            }))
            history.append({"role": "assistant", "content": full_reply})

            if "[END_INTERVIEW]" in full_reply:
                state.over = True
                break

    # ----------------------
    # RUN BOTH LOOPS
    # ----------------------
    audio_task = asyncio.create_task(audio_loop())
    convo_task = asyncio.create_task(convo_loop())

    await audio_task
    convo_task.cancel()

    # ----------------------
    # CLEANUP + SAVE SESSION
    # ----------------------
    await dg.stop()

    try:
        clean = [m for m in history if m["role"] in ("user", "assistant")]
        session_data.transcript = clean
        session_data.status = "PENDING_REPORT"
        db.commit()

        asyncio.create_task(generate_and_send_report(session_id))
    except Exception as e:
        print("Error saving transcript:", e)

    await websocket.close()
