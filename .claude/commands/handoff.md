---
description: End-of-session handoff — DEVLOG entry, TODO update, commit
---

Wrap up this session:

1. Append a new entry at the **top** of `docs/DEVLOG.md` (below the header), dated
   today, with these bullets (skip empty ones):
   - `Done:` what was completed this session
   - `Decision:` any decision made and the one-line why
   - `In progress:` anything half-finished, with the file it lives in
   - `Next:` the concrete next step
2. Update `TODO.md`: set the active task, refresh the next 2–3 steps, list blockers.
3. If anything stable changed (architecture, commands, conventions, new gotcha),
   update `CLAUDE.md` — stable facts only, keep it short.
4. `git add -A && git commit` with a one-line summary of the session. Do not push to
   main if the work belongs on a branch/PR per CLAUDE.md agent conventions.
