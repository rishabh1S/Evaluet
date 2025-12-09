import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.interview import InterviewSession
from app.services.voice_service import DeepgramService
from app.services.ai_service import get_ai_response_stream
from app.services.report_service import generate_and_send_report
import asyncio
import json

router = APIRouter()

# --- STATE MANAGER ---
class InterviewStateManager:
    def __init__(self, duration_minutes: int = 15):
        self.start_time = time.time()
        self.duration_seconds = duration_minutes * 60
        self.time_limit_reached = False
        self.is_ended = False

    def check_time(self) -> bool:
        """Returns True if time limit just expired (first time only)"""
        elapsed = time.time() - self.start_time
        if elapsed > self.duration_seconds and not self.time_limit_reached:
            self.time_limit_reached = True
            return True
        return False

# --- WEBSOCKET ENDPOINT ---
@router.websocket("/interview/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, db: Session = Depends(get_db)):
    await websocket.accept()

    # 1. Load Session
    session_data = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session_data:
        await websocket.close(code=4000)
        return

    # 2. Setup Services
    dg_service = DeepgramService()
    is_connected = await dg_service.start()
    if not is_connected:
        await websocket.close(code=5000, reason="Failed to connect to Deepgram")
        return
    
    # 3. Initialize State
    state_manager = InterviewStateManager(duration_minutes=15) # 15-minute interviews
    history = [{"role": "system", "content": session_data.system_prompt}]

    initial_greeting = f"Hello! I see you're applying for the {session_data.job_role} position. Could you introduce yourself?"

    # 1. Send Text to UI
    await websocket.send_text(json.dumps({
        "type": "transcript", "role": "assistant", "content": initial_greeting
    }))

    # 2. Send Audio
    # We fake a stream for the initial greeting
    async def fake_stream():
        yield initial_greeting

    dg_service.assistant_speaking = True
    async for audio_chunk, text_segment in dg_service.text_to_speech_stream(fake_stream()):
        await websocket.send_bytes(audio_chunk)
    dg_service.assistant_speaking = False

    history.append({"role": "assistant", "content": initial_greeting})

    # 4. Define Parallel Loops
    async def receive_audio_loop():
        """Reads audio from Client -> Sends to Deepgram"""
        try:
            while True:
                data = await websocket.receive_bytes()
                if dg_service.assistant_speaking:
                    continue
                try:
                    await dg_service.send_audio(data)
                except Exception as e:
                    print(f"Deepgram Send Audio Error: {e}")
        except WebSocketDisconnect:
            pass 
        except Exception as e:
            print(f"Audio Loop Error: {e}")

    async def conversation_loop():
        """Reads Transcripts -> Sends to AI -> Sends Audio+Text to Client"""
        try:
            while not state_manager.is_ended:
                # A. Wait for User to finish a sentence
                # We use a timeout here so we can check the time even if user is silent
                try:
                    # Check every 1 second if the queue is empty to update timer
                    user_text = await asyncio.wait_for(dg_service.transcript_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    # No speech detected, just check time and loop back
                    if state_manager.check_time():
                        # TIME IS UP! Inject system instruction.
                        print("Time limit reached. Injecting wrap-up prompt.")
                        user_text = "(Time limit reached)"
                        # Inject System Prompt override
                        history.append({"role": "system", "content": "SYSTEM: Time is up. End the interview now."})
                    else:
                        continue

                # If we got actual text (or the time trigger)
                if user_text != "(Time limit reached)":
                    if len(user_text.split()) < 2:
                        print(f"Ignored fragment: {user_text}")
                        continue

                    await websocket.send_text(json.dumps({
                        "type": "transcript", 
                        "role": "user", 
                        "content": user_text
                    }))
                    history.append({"role": "user", "content": user_text})
                
                # B. Check Time again before generating response (Double check)
                if state_manager.check_time():
                     history.append({"role": "system", "content": "SYSTEM ALERT: Time is up. Wrap up now."})

                # C. Get AI Response (Stream)
                ai_text_stream = get_ai_response_stream(history)
                full_ai_response = ""
                
                # D. Stream Audio & Accumulate Text
                dg_service.assistant_speaking = True
                async for audio_chunk, text_segment in dg_service.text_to_speech_stream(ai_text_stream):
                    
                    # Filter out the [END_INTERVIEW] tag from being spoken (Optional polish)
                    clean_segment = text_segment.replace("[END_INTERVIEW]", "")
                    
                    if clean_segment.strip():
                        await websocket.send_bytes(audio_chunk)
                    
                    full_ai_response += text_segment

                dg_service.assistant_speaking = False

                # E. Save history
                if full_ai_response.strip():
                    history.append({"role": "assistant", "content": full_ai_response})
                    
                    await websocket.send_text(json.dumps({
                        "type": "transcript", 
                        "role": "assistant", 
                        "content": full_ai_response
                    }))
                
                # F. Check for Termination Signal
                if "[END_INTERVIEW]" in full_ai_response:
                    print("AI requested termination.")
                    state_manager.is_ended = True
                    # Send a control message to frontend to close gracefully
                    await websocket.send_text(json.dumps({"type": "control", "action": "end_interview"}))
                    # Give frontend 3 seconds to receive audio before closing
                    await asyncio.sleep(3) 
                    await websocket.close()
                    break

        except Exception as e:
            print(f"Conversation Loop Error: {e}")

    # 5. Run Loops Concurrently
    try:
        receive_task = asyncio.create_task(receive_audio_loop())
        process_task = asyncio.create_task(conversation_loop())
        
        await receive_task
        
    except WebSocketDisconnect:
        print(f"Client disconnected: {session_id}")
    finally:
        process_task.cancel()
        await dg_service.stop()
        # 1. Save Transcript to DB
        # We need to use a fresh DB session because the dependency 'db' might be closed or unstable in finally block
        try:
            # FILTER HISTORY: Remove the huge System Prompt before saving to DB
            # This helps prevent DB bloat and report generation errors
            chat_only = [msg for msg in history if msg["role"] != "system"]
            session_data.transcript = chat_only
            session_data.status = "PENDING_REPORT"
            db.commit()
            print("Transcript saved.")
            
            # 2. Trigger Report Generation (Fire and Forget)
            # We use asyncio.create_task to let this run even after this function returns
            asyncio.create_task(generate_and_send_report(session_id))
            
        except Exception as e:
            print(f"Error saving transcript: {e}")
        # Ensure socket is closed
        try:
            await websocket.close()
        except:
            pass