// Pure change operations. applyOps never mutates; throws Error on invalid input.
// ponytail: also imported by test_ops.mjs under node, so no DOM/browser imports here.
const DIMS = ["width", "height", "depth", "thickness"];
const STYLE = ["material", "finish", "color"];
const TYPES = ["shelf", "drawer", "rod"];
let counter = 0;
const newId = (p) => `${p}n${Date.now().toString(36)}${++counter}`;

const pos = (v, name) => {
  if (typeof v !== "number" || !isFinite(v) || v <= 0) throw new Error(`${name} must be a positive number`);
  return v;
};
export const innerWidth = (s) => s.width - 2 * s.thickness - (s.compartments.length - 1) * s.thickness;

// Rescale compartment widths so they fill the interior; `fixedId` keeps its width.
function normalize(s, fixedId) {
  const inner = innerWidth(s);
  if (inner <= 0) throw new Error("no interior space left");
  const cs = s.compartments;
  const fixed = cs.find((c) => c.id === fixedId);
  const others = cs.filter((c) => c !== fixed);
  const room = inner - (fixed ? fixed.width : 0);
  if (fixed && (room <= 0 || !others.length)) {
    if (others.length) throw new Error("compartment too wide");
    fixed.width = inner;
    return;
  }
  const sum = others.reduce((a, c) => a + c.width, 0) || 1;
  others.forEach((c) => (c.width = (c.width / sum) * room));
}

function findItem(s, id) {
  for (const c of s.compartments) {
    const it = c.items.find((i) => i.id === id);
    if (it) return { c, it };
  }
  throw new Error(`item ${id} not found`);
}
const findComp = (s, id) => s.compartments.find((c) => c.id === id) || (() => { throw new Error(`compartment ${id} not found`); })();

function apply(s, o) {
  switch (o.op) {
    case "set_dimension":
      if (!DIMS.includes(o.field)) throw new Error("bad dimension");
      s[o.field] = pos(o.value, o.field);
      normalize(s);
      break;
    case "set_material":
      if (!STYLE.includes(o.field)) throw new Error("bad style field");
      s[o.field] = String(o.value);
      break;
    case "set_custom":
      s.custom = String(o.value ?? "");
      break;
    case "set_doors":
      if (!["hinged", "sliding"].includes(o.type)) throw new Error("bad door type");
      s.doors = { type: o.type, count: Math.max(0, Math.round(o.count ?? s.doors.count)) };
      break;
    case "add_compartment": {
      s.compartments.push({ id: newId("c"), width: pos(o.width ?? innerWidth(s) / (s.compartments.length + 1), "width"), items: [] });
      normalize(s, s.compartments.at(-1).id);
      break;
    }
    case "remove_compartment":
      if (s.compartments.length < 2) throw new Error("need at least one compartment");
      findComp(s, o.id);
      s.compartments = s.compartments.filter((c) => c.id !== o.id);
      normalize(s);
      break;
    case "set_compartment_width":
      findComp(s, o.id).width = pos(o.width, "width");
      normalize(s, o.id);
      break;
    case "add_item": {
      if (!TYPES.includes(o.type)) throw new Error("bad item type");
      const c = findComp(s, o.compartment);
      const height = o.type === "drawer" ? pos(o.height ?? 20, "height") : o.type === "shelf" ? s.thickness : 0;
      c.items.push({ id: newId("i"), type: o.type, y: Math.max(0, o.y ?? s.height / 2), height });
      break;
    }
    case "update_item": {
      const { it } = findItem(s, o.id);
      if (o.y !== undefined) it.y = Math.max(0, o.y);
      if (o.height !== undefined && it.type === "drawer") it.height = pos(o.height, "height");
      break;
    }
    case "remove_item": {
      const { c, it } = findItem(s, o.id);
      c.items = c.items.filter((i) => i !== it);
      break;
    }
    default:
      throw new Error(`unknown op ${o.op}`);
  }
}

export function applyOps(state, ops) {
  const s = structuredClone(state);
  for (const o of ops) apply(s, o);
  return s;
}

// Hebrew one-liner for the proposal card.
export function describeOp(o, s) {
  const FIELD = { width: "רוחב", height: "גובה", depth: "עומק", thickness: "עובי לוחות" };
  const TYPE = { shelf: "מדף", drawer: "מגירה", rod: "מוט תלייה" };
  switch (o.op) {
    case "set_dimension": return `${FIELD[o.field]} → ${o.value} ס״מ`;
    case "set_material": return `${{ material: "חומר", finish: "גימור", color: "צבע" }[o.field]} → ${o.value}`;
    case "set_custom": return `בקשה מותאמת: ${o.value}`;
    case "set_doors": return `דלתות: ${o.type === "sliding" ? "הזזה" : "פתיחה"} × ${o.count ?? ""}`;
    case "add_compartment": return `הוספת תא${o.width ? ` ברוחב ${o.width} ס״מ` : ""}`;
    case "remove_compartment": return `הסרת תא ${idx(s, o.id)}`;
    case "set_compartment_width": return `רוחב תא ${idx(s, o.id)} → ${o.width} ס״מ`;
    case "add_item": return `הוספת ${TYPE[o.type]} בתא ${idx(s, o.compartment)} בגובה ${o.y ?? "?"} ס״מ`;
    case "update_item": return `עדכון פריט: ${[o.y !== undefined && `גובה ${o.y}`, o.height !== undefined && `גובה מגירה ${o.height}`].filter(Boolean).join(", ")}`;
    case "remove_item": return "הסרת פריט";
    default: return o.op;
  }
}
const idx = (s, id) => (s ? s.compartments.findIndex((c) => c.id === id) + 1 || id : id);
