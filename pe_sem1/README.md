# 排球課堂 · Cantonese volleyball read-along

From the repository root, start the local server:

```powershell
uv run python -m pe_sem1.server
```

- [朱婷故事](http://127.0.0.1:8770/) plays the biography with the six supplied photos.
- [排球規則](http://127.0.0.1:8770/rules) demonstrates the worksheet's player counts,
  scoring, set rules, side changes, and court markings.
- [排球小測驗](http://127.0.0.1:8770/quiz) has 16 Traditional Chinese multiple-choice
  questions on the biography and volleyball rules, with explanations and a score.

Press **Play** to begin. **Pause** freezes the visuals and word highlighting.
**Speed** cycles through 1×, 0.85×, 0.7×, and 1.15×. Use the progress bar or
chapter buttons to jump. Stop the server with Ctrl+C. Use `--port 8771` if port
8770 is occupied.

Both lessons bundle Cantonese MP3s and word timings for offline playback. After
editing the lesson text in `web/story.json` or `web/rules/story.json`, regenerate
the matching recording and timings:

```powershell
uv run python -m pe_sem1.server --prepare-audio --lesson story
uv run python -m pe_sem1.server --prepare-audio --lesson rules
```

Regeneration sends the selected lesson text to Microsoft's online speech service
using the `edge-tts` dependency and Hong Kong Cantonese voice
`zh-HK-HiuGaaiNeural`. The server uses `aiohttp`.

