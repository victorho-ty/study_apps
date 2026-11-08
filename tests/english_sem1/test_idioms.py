from collections import Counter

from aiohttp.test_utils import TestClient, TestServer
import pytest
import pytest_asyncio

from english_sem1.idioms import server


def test_material_covers_every_worksheet_phrase_with_three_distinct_questions():
    phrases, questions = server.load_material()
    assert {phrase["phrase"] for phrase in phrases} == {
        "don't cry over spilt milk", "in a pickle", "the icing on the cake",
        "butterfingers", "not my cup of tea", "walking on egg shells",
        "keep (something) up", "keep (something) from", "look (something) over",
        "let (somebody) down", "look down on (somebody)", "look into (something)",
    }
    assert Counter(phrase["kind"] for phrase in phrases) == {"Idiom": 6, "Phrasal verb": 6}
    assert len(questions) == 36
    assert len({q["sentence"] for q in questions.values()}) == 36
    assert Counter(q["phrase_id"] for q in questions.values()) == {
        phrase["id"]: 3 for phrase in phrases
    }
    for question in questions.values():
        assert question["sentence"].count("____") == 1
        assert question["answer"]


@pytest_asyncio.fixture
async def client():
    async with TestClient(TestServer(server.create_app())) as client:
        yield client


@pytest.mark.asyncio
async def test_material_and_assets_are_served_without_exposing_answer_key_or_project(client):
    response = await client.get("/api/material")
    assert response.status == 200
    material = await response.json()
    assert len(material["phrases"]) == 12
    assert len(material["questions"]) == 36
    assert all("questions" not in phrase for phrase in material["phrases"])
    assert all(set(q) == {"id", "phrase_id", "sentence"} for q in material["questions"])
    assert all(phrase["meaning"] for phrase in material["phrases"])
    for path, content_type in (("/", "text/html"), ("/static/app.js", "application/javascript"), ("/static/style.css", "text/css")):
        response = await client.get(path)
        assert response.status == 200
        assert response.content_type in (content_type, "text/javascript")
    for path in ("/questions.json", "/server.py", "/pyproject.toml", "/static/", "/static/../server.py"):
        assert (await client.get(path)).status == 404


@pytest.mark.asyncio
async def test_every_canonical_answer_and_explicit_alternative_is_accepted(client):
    for question in client.server.app[server.QUESTIONS_KEY].values():
        for answer in (question["answer"], *question.get("alternatives", [])):
            response = await client.post(
                f"/api/questions/{question['id']}/check", json={"answer": answer}
            )
            assert response.status == 200
            assert await response.json() == {"correct": True, "answer": question["answer"]}


@pytest.mark.parametrize(("question_id", "answer", "correct"), [
    ("spilt-milk-1", "  DON’T   CRY OVER SPILLED MILK! ", True),
    ("eggshells-1", "Walking on eggshells.", True),
    ("pickle-1", "IN  A\t PICKLE", True),
    ("keep-up-3", "kept it up", True),
    ("keep-up-3", "keep it up", False),
    ("keep-up-3", "keep up", False),
    ("let-down-2", "let him down", True),
    ("let-down-2", "let down", True),
    ("look-into-1", "look into", True),
    ("look-into-1", "look it over", False),
    ("look-over-1", "look over", True),
    ("look-over-1", "look (something) over", False),
    ("pickle-1", "in a pickel", False),
    ("pickle-1", "", False),
])
@pytest.mark.asyncio
async def test_answer_check_accepts_typography_but_requires_correct_words_and_tense(client, question_id, answer, correct):
    response = await client.post(f"/api/questions/{question_id}/check", json={"answer": answer})
    assert response.status == 200
    assert (await response.json())["correct"] is correct


@pytest.mark.parametrize("payload", [None, [], {}, {"answer": None}, {"answer": 123}])
@pytest.mark.asyncio
async def test_invalid_answer_payload_is_rejected(client, payload):
    response = await client.post("/api/questions/pickle-1/check", json=payload)
    assert response.status == 400
    assert "error" in await response.json()


@pytest.mark.asyncio
async def test_bad_json_unknown_question_and_oversized_input(client):
    response = await client.post("/api/questions/pickle-1/check", data="{")
    assert response.status == 400
    response = await client.post("/api/questions/missing/check", json={"answer": "test"})
    assert response.status == 404
    response = await client.post("/api/questions/pickle-1/check", json={"answer": "x" * 5000})
    assert response.status == 413



