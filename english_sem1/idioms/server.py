"""Local English practice: uv run python -m english_sem1.idioms.server."""

import argparse
import json
import re
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parent
PHRASES_KEY = web.AppKey("phrases", list)
QUESTIONS_KEY = web.AppKey("questions", dict)


def load_material() -> tuple[list[dict], dict[str, dict]]:
    phrases = json.loads((ROOT / "questions.json").read_text(encoding="utf-8-sig"))
    questions = {}
    for phrase in phrases:
        for number, question in enumerate(phrase["questions"], 1):
            question_id = f"{phrase['id']}-{number}"
            if question["sentence"].count("____") != 1:
                raise ValueError(f"{question_id} must contain exactly one blank")
            questions[question_id] = {**question, "id": question_id, "phrase_id": phrase["id"]}
    return phrases, questions


def normalize_answer(answer: str) -> str:
    """Ignore presentation differences, but preserve words and grammar."""
    answer = answer.casefold().replace("’", "'").replace("‘", "'")
    answer = re.sub(r"\begg\s+shells\b", "eggshells", answer)
    answer = re.sub(r"\bspilled milk\b", "spilt milk", answer)
    return " ".join(answer.strip().strip(".!?,;:\"'“” ").split())


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / "static" / "index.html")


async def material(request: web.Request) -> web.Response:
    phrases = [
        {key: phrase[key] for key in ("id", "phrase", "kind", "meaning")}
        for phrase in request.app[PHRASES_KEY]
    ]
    questions = [
        {key: question[key] for key in ("id", "phrase_id", "sentence")}
        for question in request.app[QUESTIONS_KEY].values()
    ]
    return web.json_response({"phrases": phrases, "questions": questions})


async def check_answer(request: web.Request) -> web.Response:
    question = request.app[QUESTIONS_KEY].get(request.match_info["id"])
    if question is None:
        raise web.HTTPNotFound()
    try:
        payload = await request.json()
    except (ValueError, UnicodeDecodeError):
        return web.json_response({"error": "Send a JSON object with an answer."}, status=400)
    if not isinstance(payload, dict) or not isinstance(payload.get("answer"), str):
        return web.json_response({"error": "The answer must be text."}, status=400)
    answer = normalize_answer(payload["answer"])
    accepted = [question["answer"], *question.get("alternatives", [])]
    accepted_answers = {normalize_answer(item) for item in accepted}
    if request.app[PHRASES_KEY]:
        phrase = next(item for item in request.app[PHRASES_KEY] if item["id"] == question["phrase_id"])
        if phrase["kind"] == "Phrasal verb":
            optional_object = re.compile(r"\b(?:it|them|him|her|me|us|you|something|somebody|someone|anything|everything|that|this)\b")
            accepted_answers |= {
                normalize_answer(optional_object.sub(" ", item))
                for item in accepted
            }
            answer = normalize_answer(optional_object.sub(" ", answer))
    correct = bool(answer) and answer in accepted_answers
    return web.json_response({"correct": correct, "answer": question["answer"]})


def create_app() -> web.Application:
    app = web.Application(client_max_size=4096)
    phrases, questions = load_material()
    app[PHRASES_KEY] = phrases
    app[QUESTIONS_KEY] = questions
    app.router.add_get("/", index)
    app.router.add_get("/api/material", material)
    app.router.add_post("/api/questions/{id}/check", check_answer)
    for name in ("app.js", "style.css"):
        app.router.add_get(f"/static/{name}", static_file)
    return app


async def static_file(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / request.path.lstrip("/"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Semester 1 English fill-in-the-blank practice")
    parser.add_argument("--port", type=int, default=8989)
    args = parser.parse_args()
    web.run_app(create_app(), host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()



