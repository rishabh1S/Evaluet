import asyncio
import json
from typing import AsyncGenerator
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions, SpeakOptions
from app.config import settings 

# Initialize Client
deepgram = DeepgramClient(settings.DEEPGRAM_API_KEY)

class DeepgramService:
    def __init__(self):
        self.dg_connection = deepgram.listen.live.v("1")
        self.transcript_queue = asyncio.Queue() 
        self.setup_callbacks()
        self.keep_alive_task = None # Handle for the background task

    def setup_callbacks(self):
        def on_message(sender, result, **kwargs):
            try:
                if result.channel and result.channel.alternatives:
                    sentence = result.channel.alternatives[0].transcript
                    if len(sentence) > 0 and result.is_final:
                        print(f"User (Final): {sentence}")
                        self.transcript_queue.put_nowait(sentence)
            except Exception as e:
                print(f"Callback Error: {e}")

        def on_error(sender, error, **kwargs):
            print(f"Deepgram Error: {error}")

        self.dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        self.dg_connection.on(LiveTranscriptionEvents.Error, on_error)

    async def start(self):
        options = LiveOptions(
            model="nova-3",
            language="en-US",
            smart_format=True,
            # encoding="linear16", # Raw PCM from phone
            # channels=1,
            # sample_rate=16000,
            interim_results=True,
            vad_events=True,
            endpointing=5000 # Wait 5000ms of silence before marking "Final"
        )
        
        if self.dg_connection.start(options) is False:
            print("Failed to start Deepgram connection")
            return False
            
        # START KEEP ALIVE TASK
        self.keep_alive_task = asyncio.create_task(self._keep_alive_loop())
        return True

    async def _keep_alive_loop(self):
        """
        Sends a harmless JSON packet every 5 seconds to prevent Deepgram 
        from closing the connection due to silence during long AI responses.
        """
        try:
            while True:
                await asyncio.sleep(5)
                # Deepgram expects a JSON string for KeepAlive
                keep_alive_msg = json.dumps({"type": "KeepAlive"})
                self.dg_connection.send(keep_alive_msg)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"KeepAlive Error: {e}")

    async def send_audio(self, audio_data: bytes):
        self.dg_connection.send(audio_data)

    async def stop(self):
        # Cancel KeepAlive before closing
        if self.keep_alive_task:
            self.keep_alive_task.cancel()
            try:
                await self.keep_alive_task
            except asyncio.CancelledError:
                pass
                
        self.dg_connection.finish()

    async def text_to_speech_stream(self, text_stream: AsyncGenerator[str, None]):
        current_sentence = ""
        async for token in text_stream:
            current_sentence += token
            if any(punct in token for punct in [".", "?", "!"]):
                if current_sentence.strip():
                    audio_chunk = await self._generate_audio(current_sentence)
                    if audio_chunk:
                        yield (audio_chunk, current_sentence) 
                    current_sentence = ""
        
        if current_sentence.strip():
            audio_chunk = await self._generate_audio(current_sentence)
            if audio_chunk:
                yield (audio_chunk, current_sentence)

    async def _generate_audio(self, text: str) -> bytes:
        """
        FIXED: Uses .stream() instead of .save() to get raw bytes.
        """
        try:
            options = SpeakOptions(
                model="aura-2-juno-en",
                encoding="linear16",
                container="wav"
            )
    
            response = deepgram.speak.rest.v("1").stream(
                {"text": text},
                options
            )
            
            # 3. Read the buffer from the response
            # Deepgram SDK v3 returns a response object with a .stream (BytesIO)
            # We need to read that stream.
            return response.stream.read()
            
        except Exception as e:
            print(f"TTS Error: {e}")
            return None