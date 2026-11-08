"""Local practice joining sentences with so and because."""

import argparse
import json
import re
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parent
QUESTIONS_KEY = web.AppKey("questions", dict)


def load_questions() -> dict[str, dict]:
    questions = json.loads((ROOT / "questions.json").read_text(encoding="utf-8-sig"))
    return {question["id"]: question for question in questions}


def normalize_answer(answer: str) -> str:
    answer = answer.casefold().replace("’", "'")
    answer = re.sub(r"[^\w\s',]", " ", answer)
    return " ".join(answer.replace(",", " , ").split())


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / "static" / "index.html")


async def material(request: web.Request) -> web.Response:
    return web.json_response({"questions": [
        {key: question[key] for key in ("id", "part", "number", "first", "second")}
        for question in request.app[QUESTIONS_KEY].values()
    ]})


async def check_answer(request: web.Request) -> web.Response:
    question = request.app[QUESTIONS_KEY].get(request.match_info["id"])
    if question is None:
        raise web.HTTPNotFound()
    try:
        payload = await request.json()
    except (ValueError, UnicodeDecodeError):
        return web.json_response({"error": "Send a text answer."}, status=400)
    if not isinstance(payload, dict) or not isinstance(payload.get("answer"), str):
        return web.json_response({"error": "Send a text answer."}, status=400)
    accepted = [question["answer"], *question.get("alternatives", [])]
    answer = normalize_answer(payload["answer"])
    accepted_answers = {normalize_answer(item) for item in accepted}
    correct = bool(answer) and answer in accepted_answers
    without_commas = lambda text: " ".join(text.replace(",", " ").split())
    comma_error = bool(answer) and not correct and without_commas(answer) in {
        without_commas(item) for item in accepted_answers
    }
    return web.json_response({"correct": correct, "comma_error": comma_error, "answer": question["answer"]})


async def static_file(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / "static" / request.match_info["name"])


def create_app() -> web.Application:
    app = web.Application(client_max_size=4096)
    app[QUESTIONS_KEY] = load_questions()
    app.router.add_get("/", index)
    app.router.add_get("/api/material", material)
    app.router.add_post("/api/questions/{id}/check", check_answer)
    app.router.add_get(r"/static/{name:app\.js|style\.css}", static_file)
    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="So and because sentence practice")
    parser.add_argument("--port", type=int, default=8775)
    args = parser.parse_args()
    web.run_app(create_app(), host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
