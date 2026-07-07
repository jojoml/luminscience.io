# DEVLOG — LuminScience.io

Append-only journal, **newest entry on top**. Short, dated entries:
Done / Decision / In progress / Next. This file is the durable development
context — sessions are lossy, this is not.

## 2026-07-07
- Done: moved repo to `Lumina/PROJECTS/LuminScience.io`; fixed push (repo pointed at a
  deleted SSH key — now uses `jojoml-bot` key via local `core.sshCommand`); set
  `core.fileMode false` (OneDrive mode-bit noise); verified site live (HTTP 200).
- Done: adopted three-file context system (CLAUDE.md + docs/DEVLOG.md + TODO.md)
  with `/handoff` ritual.
- Prior work (from git log): mobile layout improvements, LuminScience brand spelling,
  landing page update.
- Next: see TODO.md.
