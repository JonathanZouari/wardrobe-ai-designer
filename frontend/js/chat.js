import { getState, setState } from "./state.js";
import { applyOps, describeOp } from "./ops.js";

const log = document.getElementById("log");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const history = [];
let pending = false;

export function bubble(cls, text) {
  const d = document.createElement("div");
  d.className = `msg ${cls}`;
  d.textContent = text;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  return d;
}

export function proposal(ops) {
  const before = getState();
  const card = document.createElement("div");
  card.className = "msg proposal";
  card.innerHTML = "<b>שינויים מוצעים</b><ul></ul><div class='row'><button class='ok'>אשר</button><button class='no'>בטל</button></div>";
  ops.forEach((o) => { const li = document.createElement("li"); li.textContent = describeOp(o, before); card.querySelector("ul").appendChild(li); });
  const done = (txt) => { card.querySelector(".row").remove(); card.append(txt); };
  card.querySelector(".ok").onclick = () => {
    try { setState(applyOps(getState(), ops)); done("✔ הוחל"); }
    catch (e) { done(`✖ לא ניתן להחיל: ${e.message}`); }
  };
  card.querySelector(".no").onclick = () => done("✖ בוטל");
  log.appendChild(card);
  log.scrollTop = log.scrollHeight;
}

export async function send(text) {
  text = text.trim();
  if (!text || pending) return;
  pending = true;
  document.getElementById("start")?.remove(); // any first message counts as "started"
  bubble("user", text);
  const wait = bubble("bot", "…");
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // current state goes with every message, so manual edits are always visible to the agent
      body: JSON.stringify({ message: text, history: history.slice(-12), state: getState() }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
    const { reply, ops } = await r.json();
    wait.textContent = reply || "(אין תגובה)";
    history.push({ role: "user", content: text }, { role: "assistant", content: reply });
    if (ops?.length) proposal(ops);
  } catch (e) {
    wait.textContent = `שגיאה: ${e.message}`;
  } finally {
    pending = false;
  }
}

form.addEventListener("submit", (e) => { e.preventDefault(); const t = input.value; input.value = ""; send(t); });
