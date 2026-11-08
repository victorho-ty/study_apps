"""Serve the adjective-form practice page locally."""

import argparse
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parent
ANSWERS = ("careless", "useless", "comprehensive", "offensive", "flexible", "reversible")


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / "static" / "index.html")


async def static_file(request: web.Request) -> web.FileResponse:
    return web.FileResponse(ROOT / "static" / request.match_info["name"])


async def check_answers(request: web.Request) -> web.Response:
    try:
        payload = await request.json()
    except (ValueError, UnicodeDecodeError):
        return web.json_response({"error": "Send a list of six answers."}, status=400)
    if (not isinstance(payload, dict) or not isinstance(payload.get("answers"), list)
            or len(payload["answers"]) != len(ANSWERS)
            or not all(isinstance(answer, str) for answer in payload["answers"])):
        return web.json_response({"error": "Send a list of six answers."}, status=400)
    results = [answer.strip().casefold() == expected for answer, expected in zip(payload["answers"], ANSWERS)]
    return web.json_response({"correct": results, "score": sum(results)})


async def answer_key(request: web.Request) -> web.Response:
    return web.json_response({"answers": ANSWERS})


def create_app() -> web.Application:
    app = web.Application(client_max_size=4096)
    app.router.add_get("/", index)
    app.router.add_get(r"/static/{name:app\.js|style\.css}", static_file)
    app.router.add_post("/api/check", check_answers)
    app.router.add_get("/api/answers", answer_key)
    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="Adjective form practice")
    parser.add_argument("--port", type=int, default=8989)
    args = parser.parse_args()
    web.run_app(create_app(), host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
