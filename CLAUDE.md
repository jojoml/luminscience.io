# LuminScience.io

**Before starting work, read the top 2 entries of `docs/DEVLOG.md` and all of `TODO.md`.**
At the end of every session, run the handoff ritual: append a dated entry to
`docs/DEVLOG.md`, update `TODO.md`, and commit (`/handoff` in Claude Code).

## What this is

Static marketing site for LuminScience, served by GitHub Pages at
https://luminscience.io (CNAME in repo root). Remote: `git@github.com:jojoml/luminscience.io.git`.

## Architecture

- `index.html` — the whole site (single page); inline styles + two JS files.
- `mobius3d.js` — 3D möbius hero animation; `support.js` — everything else (nav,
  sections, interactions).
- `uploads/` — demo videos embedded on the page.
- No build step: edit → open `index.html` locally to test → commit → push to `main`
  → Pages deploys automatically (live within ~1 min).

## Conventions & gotchas

- **Everything committed here is publicly served** at `luminscience.io/<path>` —
  never commit secrets, drafts, or internal data.
- Push uses the `jojoml-bot` SSH key via this repo's `core.sshCommand` (local git
  config, not committed). If push fails with a missing-key error, re-set:
  `git config core.sshCommand "ssh -F /dev/null -o IdentitiesOnly=yes -i ~/.ssh/jojoml-bot -o UserKnownHostsFile=~/.ssh/known_hosts"`
- Repo lives inside OneDrive: `core.fileMode` is set false (OneDrive flips mode bits);
  avoid symlinks — `AGENTS.md` is a pointer file.
- Brand spelling is **LuminScience** (one word, capital S).

## Agent conventions (Hermes/Codex pipeline)

- Branch: `agent/<linear-id>-<slug>` · one Linear issue per PR · PR title starts with the Linear ID.
- Agents never push to main (human pushes after merge); prefer small diffs.
- Definition of done: page renders correctly locally · PR links the Linear issue and
  states which plan acceptance criteria it satisfies.
