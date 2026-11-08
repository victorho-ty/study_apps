from collections import Counter

from aiohttp.test_utils import TestClient, TestServer
import pytest
import pytest_asyncio

from english_sem1.pronouns import server


def test_questions_cover_every_pronoun():
    words, questions = server.load_material()
    assert {item["word"] for item in words} == {
        "anyone", "anything", "everyone", "everything", "no one", "none", "nothing", "someone", "something"
    }
    assert all(item["description"] for item in words)
    assert Counter(q["answer"] for q in questions.values()) == {item["word"]: 2 for item in words}
    assert all(q["sentence"].count("____") == 1 for q in questions.values())


@pytest_asyncio.fixture
async def client():
    async with TestClient(TestServer(server.create_app())) as client:
        yield client


@pytest.mark.asyncio
async def test_material_and_answer_check(client):
    response = await client.get("/api/material")
    material = await response.json()
    assert len(material["questions"]) == 18
    assert all(set(q) == {"id", "sentence"} for q in material["questions"])
    for question in client.server.app[server.QUESTIONS_KEY].values():
        answer = "  " + question["answer"].upper() + "  "
        response = await client.post(f"/api/questions/{question['id']}/check", json={"answer": answer})
        assert (await response.json())["correct"] is True
    response = await client.post("/api/questions/no-one-1/check", json={"answer": "none"})
    assert (await response.json())["correct"] is False
    response = await client.post("/api/questions/no-one-1/check", json={"answer": "no   one"})
    assert (await response.json())["correct"] is True
    assert (await client.post("/api/questions/no-one-1/check", json={"answer": None})).status == 400
    assert (await client.post("/api/questions/missing/check", json={"answer": "anyone"})).status == 404


@pytest.mark.asyncio
async def test_page_and_static_assets(client):
    response = await client.get("/")
    assert response.status == 200
    assert "Your pronoun guide" in await response.text()
    for path in ("/static/app.js", "/static/style.css"):
        assert (await client.get(path)).status == 200
    for path in ("/questions.json", "/server.py"):
        assert (await client.get(path)).status == 404
