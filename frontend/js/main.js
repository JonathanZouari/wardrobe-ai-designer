import { TEMPLATES, setState } from "./state.js";
import "./viewer.js";
import "./editor.js";
import { send } from "./chat.js";
import "./voice.js";
import { setShowDoors } from "./viewer.js";

const start = document.getElementById("start");
const hide = () => start.remove();

// Start mode 1: just chat
document.getElementById("start-chat").onclick = () => { hide(); document.getElementById("chat-input").focus(); };
// Start mode 2: free-text description
document.getElementById("start-desc-form").onsubmit = (e) => {
  e.preventDefault();
  const t = document.getElementById("start-desc").value;
  if (t.trim()) { hide(); send(t); }
};
// Start mode 3: base template
document.querySelectorAll("[data-tpl]").forEach((b) => (b.onclick = () => { setState(TEMPLATES[b.dataset.tpl]()); hide(); }));

document.getElementById("doors-toggle").onchange = (e) => setShowDoors(e.target.checked);
