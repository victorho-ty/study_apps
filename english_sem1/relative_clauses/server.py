"""Local relative-clause sentence-combining practice."""

import argparse
import json
import re
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parent
CLAUSES_KEY = web.AppKey("clauses", list)
QUESTIONS_KEY = web.AppKey("questions", dict)


def load_material() -> tuple[list[dict], dict[str, dict]]:
    clauses = json.loads((ROOT / "questions.json").read_text(encoding="utf-8-sig"))
    questions = {}
    for clause in clauses:
        for number, question in enumerate(clause["questions"], 1):
            question_id = f"{clause['id']}-{number}"
            questions[question_id] = {**question, "id": question_id, "clause_id": clause["id"]}
    return clauses, questions


def normalize_answer(answer: str) -> str:
    answer = answer.casefold().replace("’", "'")
    answer = re.sub(r"[^\w\s']", " ", answer)
    return " ".join(answer.split())


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / "static" / "index.html")


async def material(request: web.Request) -> web.Response:
    clauses = [
        {key: clause[key] for key in ("id", "clause", "hint")}
        for clause in request.app[CLAUSES_KEY]
    ]
    questions = [
        {key: question[key] for key in ("id", "clause_id", "first", "second")}
        for question in request.app[QUESTIONS_KEY].values()
    ]
    return web.json_response({"clauses": clauses, "questions": questions})


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
    accepted = {normalize_answer(question["answer"])}
    accepted.update(normalize_answer(item) for item in question.get("alternatives", []))
    correct = bool(payload["answer"].strip()) and normalize_answer(payload["answer"]) in accepted
    return web.json_response({"correct": correct, "answer": question["answer"]})


async def static_file(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / "static" / request.match_info["name"])


def create_app() -> web.Application:
    app = web.Application(client_max_size=4096)
    clauses, questions = load_material()
    app[CLAUSES_KEY] = clauses
    app[QUESTIONS_KEY] = questions
    app.router.add_get("/", index)
    app.router.add_get("/api/material", material)
    app.router.add_post("/api/questions/{id}/check", check_answer)
    app.router.add_get(r"/static/{name:app\.js|style\.css}", static_file)
    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="Relative-clause sentence-combining practice")
    parser.add_argument("--port", type=int, default=8998)
    args = parser.parse_args()
    web.run_app(create_app(), host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()

