import asyncio

FFMPEG_CMD = [
    "ffmpeg",
    "-loglevel", "quiet",
    "-f", "webm",   
    "-i", "pipe:0",
    "-f", "s16le",
    "-ac", "1",
    "-ar", "16000",
    "pipe:1"
]

async def convert_webm_opus_to_pcm(opus_bytes: bytes) -> bytes:
    """
    Convert a webm/opus audio chunk to 16kHz mono linear16 PCM.
    Suitable for Deepgram Flux Listen v2.
    """
    process = await asyncio.create_subprocess_exec(
        *FFMPEG_CMD,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE
    )

    pcm_data, _ = await process.communicate(opus_bytes)
    return pcm_data
