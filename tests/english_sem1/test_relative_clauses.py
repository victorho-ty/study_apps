from collections import Counter

from aiohttp.test_utils import TestClient, TestServer
import pytest
import pytest_asyncio

from english_sem1.relative_clauses import server


def test_three_sentence_pairs_cover_each_relative_clause():
    clauses, questions = server.load_material()
    assert {item["clause"] for item in clauses} == {"who", "which", "where", "whose", "that"}
    assert len(questions) == 15
    assert Counter(question["clause_id"] for question in questions.values()) == {
        clause["id"]: 3 for clause in clauses
    }
    for question in questions.values():
        assert question["first"].endswith(".")
        assert question["second"].endswith(".")
        assert question["answer"].endswith(".")
        assert question["clause_id"] in {clause["id"] for clause in clauses}


@pytest_asyncio.fixture
async def client():
    async with TestClient(TestServer(server.create_app())) as client:
        yield client


@pytest.mark.asyncio
async def test_page_and_material_do_not_expose_answers(client):
    response = await client.get("/")
    assert response.status == 200
    assert "Bring two sentences together" in await response.text()
    response = await client.get("/api/material")
    assert response.status == 200
    material = await response.json()
    assert {item["clause"] for item in material["clauses"]} == {"who", "which", "where", "whose", "that"}
    assert len(material["questions"]) == 15
    assert all(set(question) == {"id", "clause_id", "first", "second"} for question in material["questions"])
    for path in ("/static/app.js", "/static/style.css"):
        assert (await client.get(path)).status == 200
    for path in ("/questions.json", "/server.py", "/pyproject.toml", "/static/../server.py"):
        assert (await client.get(path)).status == 404


@pytest.mark.asyncio
async def test_answers_are_checked_case_insensitively_and_ignore_punctuation(client):
    questions = client.server.app[server.QUESTIONS_KEY]
    for question in questions.values():
        response = await client.post(
            f"/api/questions/{question['id']}/check",
            json={"answer": question["answer"].upper()},
        )
        assert response.status == 200
        assert (await response.json())["correct"] is True


@pytest.mark.parametrize(("question_id", "answer", "correct"), [
    ("who-1", "Usain Bolt, who has won lots of gold medals, is from Jamaica!", True),
    ("where-2", "That is the library where I borrow books", True),
    ("whose-1", "I spoke to a girl which painting won first prize.", False),
    ("that-1", "The cake which Mia baked for the party was delicious.", True),
    ("who-3", "We thanked the coach that taught us how to swim.", True),
    ("which-2", "The story that I read last night was exciting.", True),
    ("which-1", "Joey's dog is a poodle which always jumps up at people.", True),
    ("who-1", "Usain Bolt has won lots of gold medals. He is from Jamaica.", False),
    ("who-1", "Usain Bolt, who is from Jamaica, has won lots of gold medals.", True),
    ("who-1", "Usain Bolt has won lots of gold medals who is from Jamaica.", False),
    ("who-1", "Usain Bolt, that has won lots of gold medals, is from Jamaica.", False),
    ("who-2", "Sue, who speaks four languages, wants to become an interpreter.", True),
    ("who-2", "Sue, who wants to become an interpreter, speaks four languages.", True),
    ("who-2", "Sue speaks four languages who wants to become an interpreter.", False),
    ("who-1", "", False),
])
@pytest.mark.asyncio
async def test_expected_clause_and_combined_sentence_are_required(client, question_id, answer, correct):
    response = await client.post(f"/api/questions/{question_id}/check", json={"answer": answer})
    assert response.status == 200
    assert (await response.json())["correct"] is correct


@pytest.mark.parametrize("payload", [[], {}, {"answer": None}, {"answer": 12}])
@pytest.mark.asyncio
async def test_invalid_payload_is_rejected(client, payload):
    response = await client.post("/api/questions/who-1/check", json=payload)
    assert response.status == 400


@pytest.mark.asyncio
async def test_bad_question_and_oversized_input_are_rejected(client):
    response = await client.post("/api/questions/unknown/check", json={"answer": "test"})
    assert response.status == 404
    response = await client.post("/api/questions/who-1/check", json={"answer": "x" * 5000})
    assert response.status == 413

