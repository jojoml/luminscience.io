# DEVLOG — LuminScience.io

Append-only journal, **newest entry on top**. Short, dated entries:
Done / Decision / In progress / Next. This file is the durable development
context — sessions are lossy, this is not.

## 2026-07-08
- Done: fixed use-case demo playback so only the active carousel video plays, every selected demo restarts from the beginning, and looping is reasserted with an `ended` fallback.
- Done: updated Join the Loop CTA copy to invite visitors to request a custom demo for their most annoying bio-chemical data workflow.
- Verified: local `python3 -m http.server 8766`, browser checks for CTA copy/video restart/video looping, HTML parse, and `node --check` for inline scripts.
- Next: push/deploy after review if the branch/Pages workflow allows it.

## 2026-07-07
- Done: moved repo to `Lumina/PROJECTS/LuminScience.io`; fixed push (repo pointed at a
  deleted SSH key — now uses `jojoml-bot` key via local `core.sshCommand`); set
  `core.fileMode false` (OneDrive mode-bit noise); verified site live (HTTP 200).
- Done: adopted three-file context system (CLAUDE.md + docs/DEVLOG.md + TODO.md)
  with `/handoff` ritual.
- Prior work (from git log): mobile layout improvements, LuminScience brand spelling,
  landing page update.
- Next: see TODO.md.
