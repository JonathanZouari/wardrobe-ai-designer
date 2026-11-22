import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from pydantic import BaseModel, Field, field_validator

load_dotenv(Path(__file__).parent / ".env", override=True)  # the shell may hold a stale key
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
app = FastAPI()
client = None  # created lazily so the app starts without a key

SYSTEM = """You are a wardrobe design assistant for straight, standard wardrobes only (no corner units, no walk-in closets, no other furniture).
Reply in the user's language (usually Hebrew), briefly. Ask a clarifying question when information is missing.
You never change the design yourself: call propose_changes with structured operations and the user will approve or cancel them.
Do not claim changes were applied. You are not an engineering check; a carpenter must verify before production.
Units are cm. Item `y` is height from the floor. Use ids from the current state when referring to compartments/items.
Compartment widths are rebalanced automatically to fill the interior, so you only set a width when the user asks.
Materials/colors/finishes come from the catalog ids below; for anything else use set_custom.
Catalog materials: melamine, oak, walnut, lacquer. Colors: white, gray, beige, oak, walnut, black. Finishes: matte, gloss, textured.
Current wardrobe state (JSON):
"""

OP = {
    "type": "object",
    "properties": {
        "op": {"type": "string", "enum": ["set_dimension", "set_material", "set_custom", "set_doors", "add_compartment",
                                          "remove_compartment", "set_compartment_width", "add_item", "update_item", "remove_item"]},
        "field": {"type": "string", "description": "set_dimension: width|height|depth|thickness. set_material: material|color|finish"},
        "value": {"description": "number for set_dimension, string for set_material/set_custom"},
        "type": {"type": "string", "description": "set_doors: hinged|sliding. add_item: shelf|drawer|rod"},
        "count": {"type": "integer"},
        "id": {"type": "string", "description": "compartment id or item id"},
        "compartment": {"type": "string", "description": "add_item: compartment id"},
        "width": {"type": "number"}, "y": {"type": "number"}, "height": {"type": "number"},
    },
    "required": ["op"],
}
TOOLS = [{"type": "function", "function": {
    "name": "propose_changes",
    "description": "Propose a list of changes to the wardrobe for the user to approve.",
    "parameters": {"type": "object", "properties": {"ops": {"type": "array", "items": OP}}, "required": ["ops"]},
}}]


class Msg(BaseModel):
    role: str
    content: str = Field(max_length=2000)


class ChatIn(BaseModel):
    message: str = Field(max_length=2000)
    history: list[Msg] = Field(default=[], max_length=12)
    state: dict

    @field_validator("state")
    @classmethod
    def state_small(cls, v):
        if len(json.dumps(v)) > 20000:
            raise ValueError("state too large")
        return v


@app.post("/api/chat")
def chat(body: ChatIn):
    global client
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(500, "OPENAI_API_KEY is not set (backend/.env)")
    client = client or OpenAI()
    msgs = [{"role": "system", "content": SYSTEM + json.dumps(body.state, ensure_ascii=False)}]
    msgs += [m.model_dump() for m in body.history if m.role in ("user", "assistant")]
    msgs.append({"role": "user", "content": body.message})
    try:
        r = client.chat.completions.create(model=MODEL, messages=msgs, tools=TOOLS, tool_choice="auto")
    except Exception as e:  # surface upstream errors to the UI
        raise HTTPException(502, f"OpenAI error: {e}")
    m = r.choices[0].message
    ops = []
    for call in m.tool_calls or []:
        try:
            ops += json.loads(call.function.arguments).get("ops", [])
        except json.JSONDecodeError:
            pass
    return {"reply": m.content or ("הנה השינויים המוצעים:" if ops else ""), "ops": ops}


# Same-origin static frontend in dev (registered last so /api wins).
app.mount("/", StaticFiles(directory=Path(__file__).parent.parent / "frontend", html=True), name="frontend")
