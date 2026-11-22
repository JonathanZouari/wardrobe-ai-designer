# Wardrobe AI Designer

Personal design tool for straight wardrobes. Describe what you want to an AI agent, edit measurements by hand, and see the result in an interactive 3D view.

> A planning aid only. The model is not a production drawing and does not replace a carpenter's engineering check.

## Features (Phase 1 prototype)
- Three-column workspace: AI chat, 3D viewer, properties editor. Desktop only.
- Three ways to start: chat, free-text description, or a base template.
- Hinged or sliding doors, free interior layout (compartments, shelves, drawers, hanging rods).
- Material, color and finish from a catalog, plus a custom request field.
- The AI only proposes changes. Nothing changes until you press Approve.
- One shared wardrobe state: manual edits are sent to the agent with your next message.

Not included yet (Phase 2): saving designs (Supabase), shareable links, AI photorealistic rendering.

## Stack
Vanilla HTML/CSS/JS + Three.js (frontend), Python + FastAPI + OpenAI (backend), Railway for deployment.

## Run locally
```
pip install -r backend/requirements.txt
```
Create `backend/.env`:
```
OPENAI_API_KEY=your-key
# OPENAI_MODEL=gpt-4o   (optional)
```
Start the server and open http://localhost:8000:
```
python -m uvicorn backend.main:app --port 8000
```
Run the change-logic check: `node frontend/test_ops.mjs`

## Structure
```
frontend/   index.html, styles.css, js/ (state, ops, viewer, editor, chat)
backend/    main.py (FastAPI: /api/chat + static frontend)
```

## Branches
`main` is production, `dev` is development.

## Security note
`/api/chat` has size limits but no authentication or rate limiting. Add both before exposing it publicly, since it calls a paid API.
