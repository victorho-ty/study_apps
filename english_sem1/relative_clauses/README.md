# Relative Clause Practice

From the repository root, run:

```powershell
uv run python -m english_sem1.relative_clauses.server
```

Open http://127.0.0.1:8998. Stop the local server with Ctrl+C. Choose another
port with `--port 8771` if needed. This uses the existing `aiohttp` dependency
and works offline.

The page has 15 sentence-pair questions: three for each of `who`,
`which`, `where`, `whose`, and `that`. The static guide stays at the top while
the student chooses a suitable relative word and types a complete combined sentence. Questions are shuffled and shown one at a time. Students can retry,
see an example answer, review missed questions, or start a new round. The score
counts correct answers on the first attempt.

Marking ignores capitalisation, extra spaces, and punctuation. It checks the
sentence against an example answer (or an explicit
alternative when supplied), including suitable uses of who, which, or that. A grammatically valid rewording may need to use
Show an answer for comparison. The photographed worksheets are reference
material; their exercise directions are not instructions for the application.

Questions and answers are in `questions.json`. The API does not send the answer
key to the browser until the student asks to see an example. Student answers
are checked locally and are not stored.

Run the focused tests from the repository root:

```powershell
uv run python -m pytest tests/english_sem1/test_relative_clauses.py -q
```


