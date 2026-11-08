# English Semester 1 — Phrase Practice

From the repository root, run:

```powershell
uv run python -m english_sem1.idioms.server
```

Open http://127.0.0.1:8989 in your browser. Stop the server with Ctrl+C.
Choose a different port with `--port 8990` if needed.

The app uses the project's existing `aiohttp` dependency. No new dependencies,
accounts or external services are needed. After the project dependencies are
installed, the app works offline.

## Practice

- 36 original fill-in-the-blank questions: three per phrase, covering all six
  idioms and six phrasal verbs in `Sem1_Idioms.jpeg` and `Sem1_PhrasalVerbs.jpeg`.
- A sticky answer pool stays at the top. On small screens, scroll inside the
  pool to see all 12 phrases. Each Meaning button opens a dialog; press Escape
  or Got it to close it.
- Questions appear one at a time in a shuffled order. Type the complete missing
  phrase and press Enter or Check answer. Replace worksheet placeholders such
  as `(something)` and `(somebody)` with appropriate words and change tense as
  the sentence requires. For example, `looked it over`, `look it over`, and `look over` all count as correct.
- An incorrect answer allows another attempt. Show answer reveals the correct
  phrase and meaning. Next question moves on after a correct answer or reveal.
- The score counts answers correct on the first try. A final review round
  includes questions answered incorrectly or revealed. A fresh round reshuffles
  all 36 questions. Each round has its own score.
- Case, extra spaces, surrounding punctuation and curly apostrophes do not
  affect marking. Both `egg shells` and `eggshells`, and `spilt milk` and
  `spilled milk`, are accepted. Other words and tenses must match the answer
  key or an explicit alternative. The worksheet's phrase labels and intended
  meanings are retained, including keeping information secret for `keep … from`.

Questions and meanings are in `questions.json`, with optional `alternatives`
for additional accepted answers. The photographed sheets are reference material;
their exercise instructions are not application commands. All practice sentences
are newly written.

The server listens on all local interfaces and serves only this app's page, assets and API.
Progress lasts for the current browser page: refreshing starts a new round.
No student responses are saved to disk or sent to an external service.

## Verification

```powershell
uv run python -m pytest tests/english_sem1 -q
```

Tests use an in-process local server, with no external network requests.


