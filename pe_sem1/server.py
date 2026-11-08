"""Serve the Cantonese volleyball lessons on localhost."""

import argparse
import asyncio
import json
import unicodedata
from pathlib import Path

from aiohttp import web

ASSETS = Path(__file__).resolve().parent / "web"


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ASSETS / "index.html")


async def rules(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ASSETS / "rules" / "index.html")


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/", index)
    app.router.add_get("/rules", rules)
    app.router.add_static("/assets/", ASSETS)
    return app


def align_boundaries(text: str, boundaries: list[dict]) -> list[dict]:
    """Map service word times to display characters, keeping punctuation intact."""
    cursor = 0
    tokens = []
    for boundary in boundaries:
        word = boundary["text"]
        start = text.find(word, cursor)
        if not word or start < 0 or boundary["duration"] <= 0:
            raise ValueError(f"Cannot align speech word {word!r}")
        skipped = text[cursor:start]
        if any(unicodedata.category(char)[0] not in "PZ" for char in skipped):
            raise ValueError(f"Speech skipped text: {skipped!r}")
        cursor = start + len(word)
        tokens.append(
            {
                "start": start,
                "end": cursor,
                "offset": boundary["offset"] / 10_000_000,
                "duration": boundary["duration"] / 10_000_000,
            }
        )
    if not tokens or any(
        unicodedata.category(char)[0] not in "PZ" for char in text[cursor:]
    ):
        raise ValueError("Speech timing does not cover the completed sentence")
    return tokens


async def prepare_audio(directory: Path = ASSETS) -> None:
    import edge_tts

    story = json.loads((directory / "story.json").read_text(encoding="utf-8"))
    # A full stop adds a pause after the spoken title and occupies one timing index.
    text = story["title"] + "。" + "".join(scene["text"] for scene in story["scenes"])
    voice = "zh-HK-HiuGaaiNeural"
    speech = edge_tts.Communicate(
        text, voice, rate="-15%", boundary="WordBoundary",
        connect_timeout=10, receive_timeout=30,
    )
    audio = bytearray()
    boundaries = []
    async with asyncio.timeout(90):
        async for chunk in speech.stream():
            if chunk["type"] == "audio":
                audio.extend(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                boundaries.append(chunk)
    if not audio:
        raise ValueError("The speech service returned no audio")
    timing = {"tokens": align_boundaries(text, boundaries), "voice": voice}
    (directory / "narration.mp3").write_bytes(audio)
    (directory / "timing.json").write_text(json.dumps(timing), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8770)
    parser.add_argument("--prepare-audio", action="store_true", help="Regenerate the Cantonese narration")
    parser.add_argument("--lesson", choices=("story", "rules"), default="story", help="Lesson to regenerate")
    args = parser.parse_args()
    if args.prepare_audio:
        directory = ASSETS / "rules" if args.lesson == "rules" else ASSETS
        asyncio.run(prepare_audio(directory))
    else:
        web.run_app(create_app(), host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()

