from aiohttp.test_utils import TestClient, TestServer
import pytest
import pytest_asyncio

from english_sem1.so_connect import server


def test_all_worksheet_pairs_including_examples_are_present():
    questions = server.load_questions()
    assert list(questions) == ["a-example", "a-1", "a-2", "a-3", "a-4", "b-example", "b-1", "b-2", "b-3", "b-4"]
    assert (questions["a-1"]["first"], questions["a-1"]["second"]) == ("Chris does not want to go sailing.", "A storm is coming.")
    assert (questions["b-4"]["first"], questions["b-4"]["second"]) == ("The oysters do not taste good.", "Water pollution is getting worse.")


@pytest_asyncio.fixture
async def client():
    async with TestClient(TestServer(server.create_app())) as client:
        yield client


@pytest.mark.asyncio
async def test_all_answer_keys_and_alternatives_are_accepted(client):
    for question in client.server.app[server.QUESTIONS_KEY].values():
        for answer in [question["answer"], *question.get("alternatives", [])]:
            response = await client.post(f"/api/questions/{question['id']}/check", json={"answer": answer.upper()})
            assert response.status == 200
            assert (await response.json())["correct"] is True


@pytest.mark.parametrize(("question_id", "answer", "correct"), [
    ("a-1", "A storm is coming, so Chris does not want to go sailing", True),
    ("a-1", "A storm is coming so Chris does not want to go sailing", False),
    ("a-1", "Because a storm is coming, Chris does not want to go sailing", True),
    ("a-1", "Because a storm is coming Chris does not want to go sailing", False),
    ("a-1", "Chris does not want to go sailing, because a storm is coming", False),
    ("a-1", "Chris does not want to go sailing because a storm is coming", True),
    ("a-1", "Chris does not want to go sailing so a storm is coming", False),
    ("b-2", "Plenty of people became homeless because the tsunami destroyed many buildings", True),
    ("b-2", "The tsunami destroyed many buildings, so plenty of people became homeless", True),
    ("b-3", "A bush fire has broken out in the woods because we should not go hiking now", False),
    ("b-3", "", False),
])
@pytest.mark.asyncio
async def test_connectors_preserve_reason_and_result(client, question_id, answer, correct):
    response = await client.post(f"/api/questions/{question_id}/check", json={"answer": answer})
    assert response.status == 200
    assert (await response.json())["correct"] is correct


@pytest.mark.asyncio
async def test_page_and_material_routes(client):
    response = await client.get("/")
    assert response.status == 200
    assert "Connecting word guide" in await response.text()
    response = await client.get("/api/material")
    data = await response.json()
    assert len(data["questions"]) == 10
    assert all("answer" not in question for question in data["questions"])
    for path in ("/static/app.js", "/static/style.css"):
        assert (await client.get(path)).status == 200
    assert (await client.get("/questions.json")).status == 404
    assert (await client.post("/api/questions/a-1/check", json={"answer": None})).status == 400
    assert (await client.post("/api/questions/missing/check", json={"answer": "x"})).status == 404


@pytest.mark.asyncio
async def test_missing_comma_provides_specific_feedback(client):
    response = await client.post("/api/questions/a-1/check", json={"answer": "A storm is coming so Chris does not want to go sailing"})
    assert (await response.json())["comma_error"] is True
    response = await client.post("/api/questions/a-1/check", json={"answer": "A storm is coming because Chris does not want to go sailing"})
    assert (await response.json())["comma_error"] is False
