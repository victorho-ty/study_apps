# study_apps

[English Semester 1 practice](english_sem1/README.md) contains five local
web apps. From this repository's root, use the launch command for the lesson
you want. For example:

```powershell
uv run python -m english_sem1.idioms.server
```

Run the lesson tests with `uv run python -m pytest tests/english_sem1 -q`.

[Volleyball practice](pe_sem1/README.md) includes the 朱婷 biography and the
volleyball rules lesson, both with Cantonese narration.

```powershell
uv run python -m pe_sem1.server
```
