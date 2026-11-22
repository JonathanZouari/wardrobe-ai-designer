import { CATALOG, getState, getSelected, select, setState, subscribe } from "./state.js";
import { applyOps } from "./ops.js";

const root = document.getElementById("props");
const TYPE = { shelf: "מדף", drawer: "מגירה", rod: "מוט תלייה" };
const opts = (list, cur) => list.map((o) => `<option value="${o.id}" ${o.id === cur ? "selected" : ""}>${o.label}</option>`).join("");
const num = (v) => Math.round(v * 10) / 10;

function render(s, sel) {
  const cIdx = s.compartments.findIndex((c) => c.id === sel);
  const found = s.compartments.flatMap((c) => c.items.map((i) => [c, i])).find(([, i]) => i.id === sel);
  root.innerHTML = `
  <h3>מידות כלליות (ס״מ)</h3>
  <div class="grid">
    ${["width:רוחב", "height:גובה", "depth:עומק", "thickness:עובי לוחות"].map((p) => { const [k, l] = p.split(":"); return `<label>${l}<input type="number" min="0.1" step="any" data-op="set_dimension" data-field="${k}" value="${s[k]}"></label>`; }).join("")}
  </div>
  <h3>חומר וגימור</h3>
  <label>חומר<select data-op="set_material" data-field="material">${opts(CATALOG.materials, s.material)}</select></label>
  <label>צבע<select data-op="set_material" data-field="color">${opts(CATALOG.colors, s.color)}</select></label>
  <label>גימור<select data-op="set_material" data-field="finish">${opts(CATALOG.finishes, s.finish)}</select></label>
  <label>בקשה מותאמת<input type="text" data-op="set_custom" value="${s.custom.replace(/"/g, "&quot;")}" placeholder="למשל: ידיות שחורות"></label>
  <h3>דלתות</h3>
  <div class="grid">
    <label>סוג<select data-op="set_doors" data-field="type"><option value="hinged" ${s.doors.type === "hinged" ? "selected" : ""}>פתיחה</option><option value="sliding" ${s.doors.type === "sliding" ? "selected" : ""}>הזזה</option></select></label>
    <label>כמות<input type="number" min="0" step="1" data-op="set_doors" data-field="count" value="${s.doors.count}"></label>
  </div>
  <h3>תאים</h3>
  ${s.compartments.map((c, i) => `
    <div class="comp ${c.id === sel ? "active" : ""}">
      <div class="row"><a href="#" data-sel="${c.id}">תא ${i + 1} · ${num(c.width)} ס״מ</a>
        <button data-del-comp="${c.id}" ${s.compartments.length < 2 ? "disabled" : ""}>הסר</button></div>
      <ul>${c.items.map((it) => `<li class="${it.id === sel ? "active" : ""}"><a href="#" data-sel="${it.id}">${TYPE[it.type]} · גובה ${num(it.y)}</a></li>`).join("")}</ul>
      <div class="row">${["shelf", "drawer", "rod"].map((t) => `<button data-add="${c.id}|${t}">+ ${TYPE[t]}</button>`).join("")}</div>
    </div>`).join("")}
  <button data-add-comp>+ תא חדש</button>
  <h3>רכיב נבחר</h3>
  ${found ? `
    <p>${TYPE[found[1].type]} (תא ${s.compartments.indexOf(found[0]) + 1})</p>
    <label>גובה מהרצפה (ס״מ)<input type="number" min="0" step="any" data-op="update_item" data-id="${sel}" data-field="y" value="${num(found[1].y)}"></label>
    ${found[1].type === "drawer" ? `<label>גובה מגירה<input type="number" min="0.1" step="any" data-op="update_item" data-id="${sel}" data-field="height" value="${found[1].height}"></label>` : ""}
    <button data-del-item="${sel}">הסר רכיב</button>`
    : cIdx >= 0 ? `<label>רוחב תא (ס״מ)<input type="number" min="0.1" step="any" data-op="set_compartment_width" data-id="${sel}" data-field="width" value="${num(s.compartments[cIdx].width)}"></label>`
    : sel === "doors" ? "<p>דלתות — ערכו בקבוצת ״דלתות״ למעלה.</p>"
    : "<p class='muted'>לחצו על רכיב במודל או ברשימה.</p>"}`;
}

function run(ops) {
  try { setState(applyOps(getState(), ops)); document.getElementById("err").textContent = ""; }
  catch (e) { document.getElementById("err").textContent = `ערך לא תקין: ${e.message}`; render(getState(), getSelected()); }
}

root.addEventListener("change", (e) => {
  const d = e.target.dataset;
  if (!d.op) return;
  const v = e.target.type === "number" ? parseFloat(e.target.value) : e.target.value;
  if (e.target.type === "number" && isNaN(v)) return run([]); // re-render with state value
  const s = getState();
  let op;
  if (d.op === "set_doors") op = { op: "set_doors", type: d.field === "type" ? v : s.doors.type, count: d.field === "count" ? v : s.doors.count };
  else if (d.op === "set_custom") op = { op: "set_custom", value: v };
  else if (d.op === "set_material" || d.op === "set_dimension") op = { op: d.op, field: d.field, value: v };
  else if (d.op === "update_item") op = { op: "update_item", id: d.id, [d.field]: v };
  else op = { op: d.op, id: d.id, [d.field]: v };
  run([op]);
});
root.addEventListener("click", (e) => {
  const t = e.target.closest("[data-sel],[data-add],[data-add-comp],[data-del-comp],[data-del-item]");
  if (!t) return;
  e.preventDefault();
  const d = t.dataset;
  if ("sel" in d) select(d.sel);
  else if ("add" in d) { const [c, type] = d.add.split("|"); run([{ op: "add_item", compartment: c, type, y: getState().height / 2, height: 20 }]); }
  else if ("addComp" in d) run([{ op: "add_compartment" }]);
  else if ("delComp" in d) run([{ op: "remove_compartment", id: d.delComp }]);
  else if ("delItem" in d) run([{ op: "remove_item", id: d.delItem }]);
});

subscribe(render);
render(getState(), getSelected());
