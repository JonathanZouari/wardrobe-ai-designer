// Voice agent: OpenAI Realtime API over WebRTC. The server only mints a short-lived secret (/api/voice/session).
// Same rule as text chat: the agent proposes ops, the user approves with the button. Nothing is applied by voice.
import { getState, subscribe } from "./state.js";
import { bubble, proposal } from "./chat.js";

const btn = document.getElementById("voice-btn");
let pc = null, dc = null, mic = null, audio = null;

function setUi(on, label) {
  btn.setAttribute("aria-pressed", on);
  btn.classList.toggle("live", on);
  btn.textContent = label ?? (on ? "⏹ עצור" : "🎤 דיבור");
}

const send = (ev) => dc?.readyState === "open" && dc.send(JSON.stringify(ev));

// Manual edits reach the agent silently (no response is triggered): refresh its view of the wardrobe.
let lastInstr = "";
subscribe(() => {
  if (!dc) return;
  send({ type: "session.update", session: { type: "realtime", instructions: lastInstr + "\n\nUpdated wardrobe state (JSON): " + JSON.stringify(getState()) } });
});

function onEvent(e) {
  switch (e.type) {
    case "conversation.item.input_audio_transcription.completed":
      if (e.transcript?.trim()) bubble("user", e.transcript.trim());
      break;
    case "response.output_audio_transcript.done":
      if (e.transcript?.trim()) bubble("bot", e.transcript.trim());
      break;
    case "response.done":
      for (const item of e.response?.output ?? []) {
        if (item.type !== "function_call" || item.name !== "propose_changes") continue;
        let ops = [];
        try { ops = JSON.parse(item.arguments).ops ?? []; } catch { /* malformed args: treat as no ops */ }
        if (ops.length) proposal(ops);
        send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: item.call_id, output: JSON.stringify({ status: "shown_to_user_awaiting_approval", not_applied_yet: true }) } });
        send({ type: "response.create" });
      }
      break;
    case "error":
      bubble("bot", `שגיאת קול: ${e.error?.message ?? "unknown"}`);
      break;
  }
}

async function start() {
  setUi(true, "מתחבר…");
  try {
    const r = await fetch("/api/voice/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: getState() }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
    const { value } = await r.json();
    lastInstr = ""; // server-side instructions stay; updates append the fresh state
    pc = new RTCPeerConnection();
    audio = new Audio(); audio.autoplay = true;
    pc.ontrack = (ev) => (audio.srcObject = ev.streams[0]);
    mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(mic.getTracks()[0]);
    dc = pc.createDataChannel("oai-events");
    dc.onmessage = (m) => onEvent(JSON.parse(m.data));
    dc.onopen = () => setUi(true);
    dc.onclose = stop;
    await pc.setLocalDescription(await pc.createOffer());
    const sdp = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: pc.localDescription.sdp, headers: { Authorization: `Bearer ${value}`, "Content-Type": "application/sdp" } });
    if (!sdp.ok) throw new Error(`realtime connect failed (${sdp.status})`);
    await pc.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
    document.getElementById("start")?.remove();
  } catch (e) {
    bubble("bot", `לא ניתן להתחיל שיחה קולית: ${e.message}`);
    stop();
  }
}

function stop() {
  mic?.getTracks().forEach((t) => t.stop());
  pc?.close();
  pc = dc = mic = audio = null;
  setUi(false);
}

btn.addEventListener("click", () => (pc ? stop() : start()));
