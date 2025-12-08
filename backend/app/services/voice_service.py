import asyncio
from typing import AsyncGenerator
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions, SpeakOptions
from app.config import settings 

deepgram = DeepgramClient(settings.DEEPGRAM_API_KEY)

class DeepgramService:
    def __init__(self):
        self.dg_connection = deepgram.listen.live.v("1")
        self.transcript_queue = asyncio.Queue() # Bridge between callback & main loop
        self.setup_callbacks()

    def setup_callbacks(self):
        """
        Connects Deepgram's background thread to our asyncio Queue.
        """
        def on_message(sender, result, **kwargs):
            try:
                # Check if we have a valid transcript result
                if result.channel and result.channel.alternatives:
                    sentence = result.channel.alternatives[0].transcript
                    
                    # Only accept non-empty, final results
                    if len(sentence) > 0 and result.is_final:
                        print(f"User (Final): {sentence}")
                        # We use 'self' from the outer class scope here
                        self.transcript_queue.put_nowait(sentence)
            except Exception as e:
                print(f"Callback Error: {e}")

        def on_error(sender, error, **kwargs):
            print(f"Deepgram Error: {error}")

        # Register the callbacks
        self.dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        self.dg_connection.on(LiveTranscriptionEvents.Error, on_error)


    async def start(self):
        """Starts the WebSocket connection to Deepgram"""
        options = LiveOptions(
            model="nova-2",
            language="en-US",
            smart_format=True,
            # encoding="linear16", # Raw PCM from phone
            # channels=1,
            # sample_rate=16000,
            interim_results=True,
            vad_events=True # Voice Activity Detection
        )
        if self.dg_connection.start(options) is False:
            print("Failed to start Deepgram connection")
            return False
        return True

    async def send_audio(self, audio_data: bytes):
        """Sends raw audio bytes to Deepgram"""
        self.dg_connection.send(audio_data)

    async def stop(self):
        self.dg_connection.finish()

    async def text_to_speech_stream(self, text_stream: AsyncGenerator[str, None]):
        """
        Consumes text stream, buffers sentences, and yields (AudioBytes, SpokenText).
        """
        # Buffer to accumulate tokens into a full sentence
        current_sentence = ""
        
        async for token in text_stream:
            current_sentence += token
            
            # Heuristic: Split on punctuation to send audio faster
            if any(punct in token for punct in [".", "?", "!"]):
                if current_sentence.strip():
                    audio_chunk = await self._generate_audio(current_sentence)
                    if audio_chunk:
                        # Yield BOTH audio and the text that generated it
                        yield (audio_chunk, current_sentence) 
                    current_sentence = ""
        
        # Flush remaining text
        if current_sentence.strip():
            audio_chunk = await self._generate_audio(current_sentence)
            if audio_chunk:
                yield (audio_chunk, current_sentence)

    async def _generate_audio(self, text: str) -> bytes:
        """Helper to call Deepgram TTS API"""
        try:
            options = SpeakOptions(
                model="aura-2-juno-en",
                encoding="linear16",
                container="wav"
            )
            response = deepgram.speak.v("1").save( # .save is weird naming, but it returns bytes if no filename
                {"text": text},
                options
            )
            return response.to_bytes() # Or response.stream if using streaming endpoint
        except Exception as e:
            print(f"TTS Error: {e}")
            return None