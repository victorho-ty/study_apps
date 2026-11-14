# 成語小書房 — Cantonese read-along

From the repository root:

```powershell
uv run python -m chinese_sem1.server
```

Open <http://127.0.0.1:8999>. Stop with Ctrl+C. Use `--port 9000` to choose another port.

Both exercises from `成語填充_2026年10月_AI.pdf` are included: 18 original sample
sentences covering nine idioms. Each blank is filled with its correct answer.
The answer is underlined in amber; the currently spoken word is highlighted in green.
Next replaces the sentence and starts the next reading. After question 18, Restart
returns to the beginning. Previous, pause/resume, replay, and speed controls are included.
The `?question=…` URL preserves the current question when refreshing.

The browser may require one click on **開始朗讀** before allowing sound. Subsequent
questions attempt to start automatically. No browser-installed Cantonese voice is needed.

Speech uses the `zh-HK-HiuGaaiNeural` Cantonese voice through `edge-tts`.
**Internet is required when generating a reading for the first time.** Completed
sentences are sent to Microsoft's online speech service; there is no microphone
or student input. MP3 audio and service-provided word timestamps are cached in
`chinese_sem1/.cache/speech/`. Cached readings work offline while the local
server is running. Highlighting follows the audio playback clock, including speed
changes and pauses; timestamps are not estimated from sentence length.

To prepare all readings before a lesson, run once while online:

```powershell
uv run python -m chinese_sem1.server --prepare-audio
```

This exits when all 18 readings are cached. Run the normal server command afterward.
Service errors are shown with a retry button; no Mandarin fallback is used.
The server listens on all local interfaces and serves only the reader's assets and audio.

The source sentences and answer key are in `questions.json`; PDF extraction is not
needed at runtime. Cache keys include the completed sentence, voice, and synthesis
rate, so changing those creates a separate recording.

Tests (speech service mocked, no external requests):

```powershell
uv run python -m pytest tests/chinese_sem1 -q
```
