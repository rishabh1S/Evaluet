import asyncio
from app.db import SessionLocal
from fastapi import APIRouter, WebSocket
from app.services.voice_service import DeepgramService 
from app.services.report_service import generate_and_send_report
from app.repository.interview_repository import load_session
from app.services.interview_runtime import audio_loop, conversation_loop, send_greeting
from app.services.interview_finalize import finalize_interview

router = APIRouter()

@router.websocket("/interview/{session_id}")
async def websocket_endpoint(websocket: WebSocket,session_id: str) -> None:
    await websocket.accept()
    db = SessionLocal()
    session_data = load_session(db, session_id)
    db.close()
    if not session_data:
        await websocket.close(code=1008, reason="Invalid session")
        return

    dg = DeepgramService(voice_model=session_data.voice_model)
    if not await dg.start():
        await websocket.close(code=1011, reason="Deepgram connection failed")
        return

    history = [{"role": "system", "content": session_data.system_prompt}]
    shutdown_event = asyncio.Event()

    greeting = (
        f"Hello! You're applying for {session_data.job_role} role. "
        "Please introduce yourself."
    )
    await send_greeting(websocket, dg, greeting, history)

    audio_task = asyncio.create_task(
        audio_loop(websocket, dg, shutdown_event)
    )
    convo_task = asyncio.create_task(
        conversation_loop(websocket, dg, history, shutdown_event)
    )

    await shutdown_event.wait()

    audio_task.cancel()
    convo_task.cancel()
    await dg.stop()

    finalize_interview(session_id, history)

    asyncio.create_task(generate_and_send_report(session_id))

    try:
        await websocket.close()
    except Exception:
        pass

