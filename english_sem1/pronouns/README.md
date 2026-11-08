# Indefinite Pronoun Practice

From the repository root, run:

```powershell
uv run python -m english_sem1.pronouns.server
```

Open http://127.0.0.1:8773. Stop with Ctrl+C. Choose another port with `--port 8774`. The server runs locally using the existing `aiohttp` dependency and needs no internet connection once the dependencies are installed.

The page shows a guide to the choices while the student types an answer to one question at a time. There are 18 original questions, two for each of nine choices. The list includes **no one**, as in the worksheet, and **none**. Answers ignore case and extra spaces. Students can retry, reveal an answer, review missed questions, or start a shuffled round. The score counts answers correct on the first attempt. Progress is held only on the page and is reset when it is refreshed.

Question text and definitions are in `questions.json`. Answer checking uses the specified answer for each question. Run the focused tests with `uv run python -m pytest tests/english_sem1/test_pronouns.py -q`.
