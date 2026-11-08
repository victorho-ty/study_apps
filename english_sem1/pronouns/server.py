"""Local indefinite-pronoun practice."""

import argparse
import json
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parent
WORDS_KEY = web.AppKey("words", list)
QUESTIONS_KEY = web.AppKey("questions", dict)


def load_material() -> tuple[list[dict], dict[str, dict]]:
    words = json.loads((ROOT / "questions.json").read_text(encoding="utf-8-sig"))
    questions = {}
    for item in words:
        for number, sentence in enumerate(item["questions"], 1):
            question_id = f"{item['word'].replace(' ', '-')}-{number}"
            if sentence.count("____") != 1:
                raise ValueError(f"{question_id} must contain exactly one blank")
            questions[question_id] = {"id": question_id, "sentence": sentence, "answer": item["word"]}
    return words, questions


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / "static" / "index.html")


async def material(request: web.Request) -> web.Response:
    words = [{"word": item["word"], "description": item["description"]} for item in request.app[WORDS_KEY]]
    questions = [{"id": q["id"], "sentence": q["sentence"]} for q in request.app[QUESTIONS_KEY].values()]
    return web.json_response({"words": words, "questions": questions})


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
    answer = " ".join(payload["answer"].casefold().split())
    return web.json_response({"correct": answer == question["answer"], "answer": question["answer"]})


async def static_file(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / "static" / request.match_info["name"])


def create_app() -> web.Application:
    app = web.Application(client_max_size=4096)
    app[WORDS_KEY], app[QUESTIONS_KEY] = load_material()
    app.router.add_get("/", index)
    app.router.add_get("/api/material", material)
    app.router.add_post("/api/questions/{id}/check", check_answer)
    app.router.add_get(r"/static/{name:app\.js|style\.css}", static_file)
    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="Indefinite pronoun practice")
    parser.add_argument("--port", type=int, default=8773)
    args = parser.parse_args()
    web.run_app(create_app(), host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
