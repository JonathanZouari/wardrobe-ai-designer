// Run: node frontend/test_ops.mjs
import assert from "node:assert/strict";
import { applyOps, innerWidth } from "./js/ops.js";

const base = {
  width: 120, height: 200, depth: 60, thickness: 2, material: "melamine", finish: "matte", color: "white", custom: "",
  doors: { type: "hinged", count: 2 },
  compartments: [{ id: "c1", width: 57, items: [{ id: "i1", type: "shelf", y: 50, height: 2 }] }, { id: "c2", width: 57, items: [] }],
};
const copy = JSON.stringify(base);
const sum = (s) => s.compartments.reduce((a, c) => a + c.width, 0);

let s = applyOps(base, [{ op: "set_dimension", field: "width", value: 240 }]);
assert.equal(s.width, 240);
assert.ok(Math.abs(sum(s) - innerWidth(s)) < 1e-9, "compartments fill interior");
assert.equal(JSON.stringify(base), copy, "input not mutated");

s = applyOps(base, [{ op: "add_compartment" }]);
assert.equal(s.compartments.length, 3);
assert.ok(Math.abs(sum(s) - innerWidth(s)) < 1e-9);

s = applyOps(base, [{ op: "set_compartment_width", id: "c1", width: 40 }]);
assert.equal(s.compartments[0].width, 40);
assert.ok(Math.abs(sum(s) - innerWidth(s)) < 1e-9);

s = applyOps(base, [{ op: "add_item", compartment: "c2", type: "drawer", y: 10, height: 20 }, { op: "remove_item", id: "i1" }]);
assert.equal(s.compartments[1].items[0].type, "drawer");
assert.equal(s.compartments[0].items.length, 0);

assert.throws(() => applyOps(base, [{ op: "set_dimension", field: "width", value: -5 }]));
assert.throws(() => applyOps(base, [{ op: "set_dimension", field: "width", value: 4 }]));
assert.throws(() => applyOps(base, [{ op: "nope" }]));
console.log("ok");
