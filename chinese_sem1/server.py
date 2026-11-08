"""Local Cantonese idiom reader: uv run python -m chinese_sem1.server."""

import argparse
import asyncio
import hashlib
import json
import logging
import unicodedata
from pathlib import Path

import aiohttp
from aiohttp import web
import edge_tts
from edge_tts.exceptions import EdgeTTSException

ROOT = Path(__file__).resolve().parent
VOICE = "zh-HK-HiuGaaiNeural"
RATE = "-15%"
LOGGER = logging.getLogger(__name__)


def load_questions() -> list[dict]:
    questions = json.loads((ROOT / "questions.json").read_text(encoding="utf-8"))
    for index, question in enumerate(questions, 1):
        template = question["question"]
        if template.count("____") != 1:
            raise ValueError(f"Question {index} must have exactly one blank")
        start = template.index("____")
        question.update(
            id=index,
            text=template.replace("____", question["answer"]),
            answer_start=start,
            answer_end=start + len(question["answer"]),
        )
    return questions


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


class SpeechCache:
    def __init__(self, directory: Path):
        self.directory = directory
        self.locks: dict[str, asyncio.Lock] = {}

    def paths(self, text: str) -> tuple[Path, Path]:
        key = hashlib.sha256(f"v1|{VOICE}|{RATE}|{text}".encode()).hexdigest()
        return self.directory / f"{key}.mp3", self.directory / f"{key}.json"

    async def prepare(self, text: str) -> dict:
        audio_path, timing_path = self.paths(text)
        lock = self.locks.setdefault(audio_path.stem, asyncio.Lock())
        async with lock:
            if audio_path.is_file() and timing_path.is_file():
                return json.loads(timing_path.read_text(encoding="utf-8"))

            speech = edge_tts.Communicate(
                text, VOICE, rate=RATE, boundary="WordBoundary",
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
            result = {"tokens": align_boundaries(text, boundaries), "voice": VOICE}
            self.directory.mkdir(parents=True, exist_ok=True)
            # Publish only completed files so interrupted synthesis can be retried.
            audio_temp = audio_path.with_suffix(".mp3.tmp")
            timing_temp = timing_path.with_suffix(".json.tmp")
            audio_temp.write_bytes(audio)
            timing_temp.write_text(json.dumps(result), encoding="utf-8")
            audio_temp.replace(audio_path)
            timing_temp.replace(timing_path)
            return result


QUESTIONS_KEY = web.AppKey("questions", list)
CACHE_KEY = web.AppKey("speech_cache", SpeechCache)


def get_question(request: web.Request) -> dict:
    question_id = int(request.match_info["id"])
    questions = request.app[QUESTIONS_KEY]
    if not 1 <= question_id <= len(questions):
        raise web.HTTPNotFound()
    return questions[question_id - 1]


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / "static" / "index.html")


async def questions(request: web.Request) -> web.Response:
    return web.json_response(request.app[QUESTIONS_KEY])


async def speech(request: web.Request) -> web.Response:
    question = get_question(request)
    try:
        result = await request.app[CACHE_KEY].prepare(question["text"])
    except (aiohttp.ClientError, EdgeTTSException, TimeoutError, OSError, ValueError):
        LOGGER.exception("Unable to prepare Cantonese audio for question %s", question["id"])
        return web.json_response(
            {"error": "未能準備粵語聲音，請檢查網絡連線，再按「重試朗讀」。"}, status=503
        )
    return web.json_response({**result, "audio_url": f"/audio/{question['id']}.mp3"})


async def audio(request: web.Request) -> web.FileResponse:
    question = get_question(request)
    audio_path, _ = request.app[CACHE_KEY].paths(question["text"])
    if not audio_path.is_file():
        raise web.HTTPNotFound()
    return web.FileResponse(audio_path, headers={"Content-Type": "audio/mpeg"})


def create_app(cache_directory: Path | None = None) -> web.Application:
    app = web.Application()
    app[QUESTIONS_KEY] = load_questions()
    app[CACHE_KEY] = SpeechCache(cache_directory or ROOT / ".cache" / "speech")
    app.router.add_get("/", index)
    app.router.add_get("/api/questions", questions)
    app.router.add_get(r"/api/questions/{id:\d+}/speech", speech)
    app.router.add_get(r"/audio/{id:\d+}.mp3", audio)
    app.router.add_static("/static/", ROOT / "static", show_index=False)
    return app


async def prepare_all(cache: SpeechCache) -> None:
    for question in load_questions():
        await cache.prepare(question["text"])
        LOGGER.info("Prepared question %s/18", question["id"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Cantonese idiom read-along")
    parser.add_argument("--port", type=int, default=8999)
    parser.add_argument("--prepare-audio", action="store_true", help="Cache all 18 readings and exit")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    if args.prepare_audio:
        asyncio.run(prepare_all(SpeechCache(ROOT / ".cache" / "speech")))
    else:
        web.run_app(create_app(), host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
