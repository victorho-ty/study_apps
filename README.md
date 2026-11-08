# Study Apps

A series of Web Apps to make studying and reviewing more fun and interactive.

[English Semester 1 practice](english_sem1/README.md) contains a number of local apps. 
From this repository's root, use the launch command for the lesson you want. For example:

```powershell
uv run python -m english_sem1.idioms.server
```

Run the lesson tests with `uv run python -m pytest tests/english_sem1 -q`.

[Chinese Semester 1 practice](chinese_sem1/README.md) includes 18 Chinese idioms.

```powershell
uv run python -m chinese_sem1.server
```

[Volleyball practice](pe_sem1/README.md) includes 朱婷 biography and volleyball rules, both with Chinese narration.

```powershell
uv run python -m pe_sem1.server
```