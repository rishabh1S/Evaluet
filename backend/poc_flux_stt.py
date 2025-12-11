# poc_flux_stt.py
import asyncio
from dotenv import load_dotenv

load_dotenv() 

from app.services.voice_service import DeepgramService


async def main():
    dg = DeepgramService()
    ok = await dg.start()
    if not ok:
        print("Failed to start Flux")
        return

    # Expect test.raw = 16kHz mono s16le PCM
    with open("test.raw", "rb") as f:
        while True:
            chunk = f.read(2560)
            if not chunk:
                break
            await dg.send_audio(chunk)
            await asyncio.sleep(0.08)

    try:
        text = await asyncio.wait_for(dg.transcript_queue.get(), timeout=10)
        print("Final transcript:", text)
    except asyncio.TimeoutError:
        print("No EndOfTurn")
    finally:
        await dg.stop()


if __name__ == "__main__":
    asyncio.run(main())
