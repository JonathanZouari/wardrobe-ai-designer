// Single source of truth for the wardrobe + tiny pub/sub store. Units: cm.
export const CATALOG = {
  materials: [
    { id: "melamine", label: "מלמין" },
    { id: "oak", label: "אלון" },
    { id: "walnut", label: "אגוז" },
    { id: "lacquer", label: "לכה" },
  ],
  finishes: [
    { id: "matte", label: "מט" },
    { id: "gloss", label: "מבריק" },
    { id: "textured", label: "מחוספס" },
  ],
  colors: [
    { id: "white", label: "לבן", hex: "#f2f2ee" },
    { id: "gray", label: "אפור", hex: "#8d9196" },
    { id: "beige", label: "בז'", hex: "#d8c7a8" },
    { id: "oak", label: "עץ אלון", hex: "#c49a62" },
    { id: "walnut", label: "אגוז כהה", hex: "#5b3a24" },
    { id: "black", label: "שחור", hex: "#262626" },
  ],
};

let n = 0;
export const uid = (p = "x") => `${p}${++n}`;

const item = (type, y, height) => ({ id: uid("i"), type, y, height });
const comp = (width, items) => ({ id: uid("c"), width, items });

export const TEMPLATES = {
  basic: () => ({
    width: 120, height: 220, depth: 60, thickness: 2,
    material: "melamine", finish: "matte", color: "white", custom: "",
    doors: { type: "hinged", count: 2 },
    compartments: [
      comp(57, [item("shelf", 60), item("shelf", 110), item("shelf", 160)]),
      comp(57, [item("rod", 200), item("shelf", 120)]),
    ],
  }),
  sliding: () => ({
    width: 200, height: 240, depth: 60, thickness: 2,
    material: "oak", finish: "matte", color: "oak", custom: "",
    doors: { type: "sliding", count: 2 },
    compartments: [
      comp(64, [item("rod", 220), item("shelf", 100)]),
      comp(64, [item("shelf", 50), item("shelf", 100), item("shelf", 150), item("shelf", 200)]),
      comp(64, [item("drawer", 10, 20), item("drawer", 35, 20), item("drawer", 60, 20), item("rod", 220)]),
    ],
  }),
  drawers: () => ({
    width: 160, height: 220, depth: 55, thickness: 2,
    material: "lacquer", finish: "gloss", color: "gray", custom: "",
    doors: { type: "hinged", count: 4 },
    compartments: [
      comp(77, [item("drawer", 5, 25), item("drawer", 35, 25), item("drawer", 65, 25), item("shelf", 120), item("shelf", 170)]),
      comp(77, [item("rod", 200), item("shelf", 130)]),
    ],
  }),
};

const store = { state: TEMPLATES.basic(), selected: null, subs: [] };
export const getState = () => store.state;
export const getSelected = () => store.selected;
export const subscribe = (fn) => store.subs.push(fn);
const emit = () => store.subs.forEach((f) => f(store.state, store.selected));
export function setState(next) {
  // drop selection if its target vanished
  const ids = new Set(["doors", ...next.compartments.flatMap((c) => [c.id, ...c.items.map((i) => i.id)])]);
  if (store.selected && !ids.has(store.selected)) store.selected = null;
  store.state = next;
  emit();
}
export function select(id) { store.selected = id; emit(); }
