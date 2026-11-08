# So and Because Practice

From the repository root, run:

```powershell
uv run python -m english_sem1.so_connect.server
```

Open http://127.0.0.1:8775. Stop with Ctrl+C, or choose another port with `--port 8776`. The local server uses the existing `aiohttp` dependency and works offline once dependencies are installed.

The quiz includes the eight numbered pairs and both worked-example pairs from the supplied photograph. It shows one question at a time and a guide to the connecting words. Each pair can be joined using **so** or **because**, and the order can be changed while preserving the reason and result. The two examples are offered as questions too.

The student can retry, show an example answer, review missed questions, or restart. Scores count answers correct on the first attempt. Progress is not saved when the page is refreshed. Answers are checked locally against the sample answer and listed alternatives. Capitalisation, whitespace and punctuation other than commas are ignored. Commas must match the answer, including before so and after an opening because clause; other valid rewordings may not match, so use Show an answer to compare. The answer bank is in `questions.json`.

Run focused tests with `uv run python -m pytest tests/english_sem1/test_so_connect.py -q`.
