import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { CATALOG, getState, getSelected, select, subscribe } from "./state.js";

const el = document.getElementById("viewer");
const scene = new THREE.Scene();
// no scene.background: the CSS stage gradient shows through the transparent canvas
const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
camera.position.set(260, 230, 360);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(devicePixelRatio);
el.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.className = "labels";
el.appendChild(labels.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 100, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0xaaaabb, 2.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(200, 400, 300);
scene.add(sun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(450, 64), new THREE.MeshStandardMaterial({ color: 0xcfd6db, transparent: true, opacity: 0.55 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

let group = null;
let showDoors = true;
export const setShowDoors = (v) => { showDoors = v; build(getState(), getSelected()); };

function mat(s, sel) {
  const hex = CATALOG.colors.find((c) => c.id === s.color)?.hex || "#cccccc";
  const m = new THREE.MeshStandardMaterial({
    color: hex,
    roughness: s.finish === "gloss" ? 0.2 : s.finish === "textured" ? 0.95 : 0.65,
    metalness: s.material === "lacquer" ? 0.1 : 0,
  });
  if (sel) { m.emissive = new THREE.Color(0x2b6cff); m.emissiveIntensity = 0.55; }
  return m;
}

function label(text, pos, cls = "dim") {
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = text;
  const o = new CSS2DObject(d);
  o.position.copy(pos);
  group.add(o);
}

function build(s, selected) {
  if (group) { scene.remove(group); group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); labelsClear(); }
  group = new THREE.Group();
  const { width: W, height: H, depth: D, thickness: t } = s;
  const box = (w, h, d, x, y, z, id, extra) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), extra || mat(s, id && id === selected));
    m.position.set(x, y, z);
    m.userData.id = id;
    group.add(m);
    return m;
  };
  // body shell
  box(t, H, D, -W / 2 + t / 2, H / 2, 0, "body");
  box(t, H, D, W / 2 - t / 2, H / 2, 0, "body");
  box(W, t, D, 0, H - t / 2, 0, "body");
  box(W, t, D, 0, t / 2, 0, "body");
  box(W - 2 * t, H - 2 * t, 0.6, 0, H / 2, -D / 2 + 0.3, "body");

  // compartments
  let x = -W / 2 + t;
  s.compartments.forEach((c, ci) => {
    const cx = x + c.width / 2;
    c.items.forEach((it) => {
      const sel = it.id === selected;
      if (it.type === "shelf") box(c.width, t, D - 2, cx, it.y, 0, it.id);
      else if (it.type === "drawer") box(c.width - 1, it.height, D - 4, cx, it.y + it.height / 2, 1, it.id);
      else {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, c.width, 12), new THREE.MeshStandardMaterial({ color: sel ? 0x2b6cff : 0xb8bcc2, metalness: 0.8, roughness: 0.3 }));
        rod.rotation.z = Math.PI / 2;
        rod.position.set(cx, it.y, 0);
        rod.userData.id = it.id;
        group.add(rod);
      }
    });
    x += c.width;
    if (ci < s.compartments.length - 1) { box(t, H - 2 * t, D - 1, x + t / 2, H / 2, 0, "body"); x += t; }
  });

  // doors (semi-transparent so the interior stays visible)
  if (showDoors && s.doors.count > 0) {
    const n = s.doors.count, sliding = s.doors.type === "sliding";
    const dw = sliding ? (W / n) * 1.08 : W / n;
    const dm = mat(s, selected === "doors");
    dm.transparent = true; dm.opacity = 0.35;
    for (let i = 0; i < n; i++) {
      const dx = -W / 2 + (W / n) * (i + 0.5);
      const z = D / 2 + 0.5 + (sliding ? (i % 2) * 1.5 : 0);
      const door = box(dw - 0.4, H - 1, 1.2, dx, H / 2, z, "doors", dm);
      if (!sliding) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(1, 12, 1.5), new THREE.MeshStandardMaterial({ color: 0x777777 }));
        handle.position.set(i % 2 ? dx - dw / 2 + 4 : dx + dw / 2 - 4, H / 2, z + 1.4);
        group.add(handle);
      }
    }
  }

  // dimensions
  label(`${W} ס״מ`, new THREE.Vector3(0, H + 8, D / 2));
  label(`${H} ס״מ`, new THREE.Vector3(-W / 2 - 10, H / 2, D / 2));
  label(`${D} ס״מ`, new THREE.Vector3(W / 2 + 8, 0, 0));
  if (selected) {
    const x0 = (() => { let a = -W / 2 + t; for (const c of s.compartments) { const hit = c.id === selected || c.items.some((i) => i.id === selected); if (hit) return [a, c]; a += c.width + t; } })();
    const found = x0 && (x0[1].id === selected ? null : x0[1].items.find((i) => i.id === selected));
    if (found) label(`גובה ${Math.round(found.y)}${found.type === "drawer" ? ` · ${found.height}` : ""}`, new THREE.Vector3(x0[0] + x0[1].width / 2, found.y + 6, D / 2), "dim sel");
    else if (x0) label(`רוחב ${x0[1].width.toFixed(1)}`, new THREE.Vector3(x0[0] + x0[1].width / 2, H - 10, D / 2), "dim sel");
  }
  scene.add(group);
}
function labelsClear() { labels.domElement.querySelectorAll(".dim").forEach((n) => n.remove()); }

// pick (ignore drags: only treat as click if pointer barely moved)
const ray = new THREE.Raycaster();
let down = null;
renderer.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObjects(group.children, false).find((h) => h.object.userData.id && h.object.userData.id !== "body");
  select(hit ? hit.object.userData.id : null);
});

function resize() {
  const { clientWidth: w, clientHeight: h } = el;
  renderer.setSize(w, h); labels.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(el);
resize();
subscribe(build);
build(getState(), getSelected());
(function loop() { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); labels.render(scene, camera); })();
