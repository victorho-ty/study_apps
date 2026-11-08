from aiohttp.test_utils import TestClient, TestServer
import pytest
import pytest_asyncio

from english_sem1.adjective_form import server


@pytest_asyncio.fixture
async def client():
    async with TestClient(TestServer(server.create_app())) as client:
        yield client


@pytest.mark.asyncio
async def test_page_serves_all_six_word_prompts_and_only_app_assets(client):
    response = await client.get("/")
    page = await response.text()
    assert response.status == 200
    assert "Our School Camping Trip" in page
    for index, word in enumerate(("care", "use", "comprehend", "offend", "flex", "reverse"), 1):
        assert f'id="answer-{index}"' in page
        assert f"({word})" in page
    for path in ("/static/app.js", "/static/style.css"):
        assert (await client.get(path)).status == 200
    assert (await client.get("/server.py")).status == 404


@pytest.mark.asyncio
async def test_answer_check_scores_case_and_whitespace_but_requires_one_correct_word(client):
    response = await client.post("/api/check", json={"answers": [" CARELESS ", "useful", "comprehensive", "offensive", "flexible", "reversible jacket"]})
    assert response.status == 200
    assert await response.json() == {"correct": [True, False, True, True, True, False], "score": 4}
    response = await client.get("/api/answers")
    assert (await response.json())["answers"] == ["careless", "useless", "comprehensive", "offensive", "flexible", "reversible"]


@pytest.mark.parametrize("payload", [{}, {"answers": []}, {"answers": ["x"] * 5 + [None]}, []])
@pytest.mark.asyncio
async def test_invalid_check_request_is_rejected(client, payload):
    assert (await client.post("/api/check", json=payload)).status == 400
