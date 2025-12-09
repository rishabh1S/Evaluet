import asyncio
from typing import AsyncGenerator
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions, SpeakOptions
from app.config import settings 

# Initialize Client
deepgram = DeepgramClient(settings.DEEPGRAM_API_KEY)

class DeepgramService:
    def __init__(self):
        self.dg_connection = deepgram.listen.live.v("1")
        self.transcript_queue = asyncio.Queue() 
        self.assistant_speaking = False 
        self.setup_callbacks()
        self.keep_alive_task = None # Handle for the background task

    def setup_callbacks(self):
        def on_message(sender, result, **kwargs):
            try:
                if result.channel and result.channel.alternatives:
                    sentence = result.channel.alternatives[0].transcript
                    if len(sentence) > 0 and result.is_final:
                        print(f"User (Final): {sentence}")
                        if not self.assistant_speaking:
                            self.transcript_queue.put_nowait(sentence)
            except Exception as e:
                print(f"Callback Error: {e}")

        def on_error(sender, error, **kwargs):
            print(f"Deepgram Error: {error}")

        def on_close(sender, close_event, **kwargs):
            print(f"Deepgram Connection Closed: {close_event}")

        self.dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        self.dg_connection.on(LiveTranscriptionEvents.Error, on_error)
        self.dg_connection.on(LiveTranscriptionEvents.Close, on_close)

    async def start(self):
        options = LiveOptions(
            model="nova-3",
            language="en-US",
            smart_format=True,
            # encoding="linear16", # Raw PCM from phone
            # channels=1,
            # sample_rate=16000,
            interim_results=True,
            utterance_end_ms=1200,
            endpointing=300,
            filler_words=True,
            vad_events=True
        )
        
        result = self.dg_connection.start(options)
        if result is False:
            print("Failed to start Deepgram connection")
            return False
            
        print("Deepgram connection started successfully")
            
        # START KEEP ALIVE TASK
        self.keep_alive_task = asyncio.create_task(self._keep_alive_loop())
        return True

    async def _keep_alive_loop(self):
        """
        Sends a KeepAlive message every 5 seconds to prevent timeout.
        FIXED: Uses synchronous send() in executor to avoid await issues.
        """
        while True:
            await asyncio.sleep(5)
            try:
                # Use the built-in keep_alive method if available
                if hasattr(self.dg_connection, 'keep_alive'):
                    # This is synchronous, so run it in an executor
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(None, self.dg_connection.keep_alive)
                    print("[KeepAlive] sent")
                else:
                    print("[KeepAlive] method not available")
                    
            except Exception as e:
                print(f"[KeepAlive ERROR] {e}")
                # If keepalive fails repeatedly, connection might be dead
                break

    async def send_audio(self, audio_data: bytes):
        """
        Sends audio data to Deepgram.
        FIXED: Run synchronous send() in executor.
        """
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self.dg_connection.send, audio_data)
        except Exception as e:
            print(f"Send Audio Error: {e}")

    async def stop(self):
        """
        Properly cleanup the connection.
        """
        # Cancel KeepAlive before closing
        if self.keep_alive_task and not self.keep_alive_task.done():
            self.keep_alive_task.cancel()
            try:
                await self.keep_alive_task
            except asyncio.CancelledError:
                pass
        
        # Finish the connection
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self.dg_connection.finish)
            print("Deepgram connection closed")
        except Exception as e:
            print(f"Error closing Deepgram: {e}")

    async def text_to_speech_stream(self, text_stream: AsyncGenerator[str, None]):
        """
        Converts streaming text to audio chunks.
        Yields (audio_bytes, text_segment) tuples.
        """
        current_sentence = ""

        async for token in text_stream:
            current_sentence += token
            if any(punct in token for punct in [".", "?", "!", "\n"]):
                if current_sentence.strip():
                    audio_chunk = await self._generate_audio(current_sentence)
                    if audio_chunk:
                        yield (audio_chunk, current_sentence)
                    current_sentence = ""
        
        # Handle remaining text
        if current_sentence.strip():
            audio_chunk = await self._generate_audio(current_sentence)
            if audio_chunk:
                yield (audio_chunk, current_sentence)

    async def _generate_audio(self, text: str) -> bytes:
        """
        Generate audio from text using Deepgram TTS.
        """
        try:
            options = SpeakOptions(
                model="aura-2-juno-en",
                encoding="linear16",
                container="wav"
            )
    
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: deepgram.speak.rest.v("1").stream({"text": text}, options)
            )
            
            # Read the audio data
            audio_data = response.stream.read()
            return audio_data
            
        except Exception as e:
            print(f"TTS Error: {e}")
            return None