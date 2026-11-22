# Wardrobe AI Designer

Personal designer for straight wardrobes: AI chat | 3D viewer | properties editor. Desktop web only.
Not a CAD/production tool: no engineering checks, pricing or orders. The PRD is the source of truth for scope.

## Status
Phase 1 (interactive prototype, in-memory state) is built. Phase 2 (Supabase persistence with secret links, AI photorealistic rendering) is not started.

## Stack
- Frontend: vanilla HTML/CSS/JS + Three.js (CDN importmap) in `frontend/`.
- Backend: Python + FastAPI + OpenAI in `backend/`. It also serves `frontend/` in dev.
- Deploy: Railway, two environments (Development from `dev`, Production from `main`).

## Run
```
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --port 8000   # http://localhost:8000
node frontend/test_ops.mjs                        # unit check for change ops
```
Needs `backend/.env` with `OPENAI_API_KEY=...` (gitignored, never commit). Optional `OPENAI_MODEL` (default gpt-4o).

## Architecture rules
- One wardrobe state (`frontend/js/state.js`, units cm). Viewer, editor and agent all use it.
- Every change goes through `applyOps` in `frontend/js/ops.js` (pure, never mutates, throws on invalid input). Keep it free of DOM imports (node test imports it).
- AI changes are only proposals: backend returns `{reply, ops}`, the UI shows a card, and state changes only after the user approves. Never apply AI ops automatically.
- The agent never reacts to manual edits on its own; the current state is sent with each chat message.
- The op schema exists in two places: `ops.js` and the `OP` tool schema in `backend/main.py`. Keep them in sync.
- No drag & drop in the 3D scene; editing is via fields.

## Git
- Branches: `main` (production), `dev` (development). Work on `dev`, merge to `main` to release.
- Commit after each completed change; run `node frontend/test_ops.mjs` after changing `ops.js`.

## UI
Hebrew, RTL panels inside an LTR three-column grid (chat left, viewer center, properties right).
