import argparse
import asyncio
import json
from importlib import import_module
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory

from aiohttp import web

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(STATIC / "index.html")


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/", index)
    app.router.add_static("/static/", STATIC)
    return app


async def prepare_audio() -> None:
    speech = import_module("chinese_sem1.4w_phrases.server")
    lessons = json.loads((STATIC / "lessons.json").read_text(encoding="utf-8"))
    output = STATIC / "audio"
    semaphore = asyncio.Semaphore(4)
    with TemporaryDirectory() as temporary:
        cache = speech.SpeechCache(Path(temporary))

        async def prepare_lesson(lesson: dict) -> dict:
            term = lesson["term"]
            example_start = len(term) + 1
            reading = f"{term}。{lesson['example']}"
            async with semaphore:
                term_timing = (await cache.prepare(term))["tokens"]
                reading_timing = (await cache.prepare(reading))["tokens"]
            sentence_timing = [
                {**token, "start": token["start"] - example_start, "end": token["end"] - example_start}
                for token in reading_timing
                if token["start"] >= example_start
            ]
            return {
                "term": term_timing,
                "intro": [token for token in reading_timing if token["end"] <= len(term)],
                "sentence": sentence_timing,
            }

        timings = await asyncio.gather(*(prepare_lesson(lesson) for lesson in lessons))
        output.mkdir(exist_ok=True)
        for number, lesson in enumerate(lessons, 1):
            term = lesson["term"]
            term_audio, _ = cache.paths(term)
            reading_audio, _ = cache.paths(f"{term}。{lesson['example']}")
            copyfile(term_audio, output / f"{number}-term.mp3")
            copyfile(reading_audio, output / f"{number}-example.mp3")
        (output / "readings.json").write_text(json.dumps(timings), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Cantonese vocabulary lessons and quiz")
    parser.add_argument("--port", type=int, default=9003)
    parser.add_argument("--prepare-audio", action="store_true")
    args = parser.parse_args()
    if args.prepare_audio:
        asyncio.run(prepare_audio())
    else:
        web.run_app(create_app(), host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
