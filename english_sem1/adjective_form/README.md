# Adjective Form Practice

From the repository root, run:

```powershell
uv run python -m english_sem1.adjective_form.server
```

Open http://127.0.0.1:8989. Stop the server with Ctrl+C. Use `--port 8772` to choose another port. The server listens on the local computer and uses the existing `aiohttp` dependency.

The page presents the supplied camping-trip passage with six inline blanks. Check answers to see a score out of six and feedback beside each blank, edit any response and check again, or show the supplied answer key. Start again clears the answers. Marking ignores surrounding spaces and letter case; each answer must be the supplied single word. Answers are checked locally and are not saved.

Run the focused checks with `uv run python -m pytest tests/english_sem1/test_adjective_form.py -q`.
