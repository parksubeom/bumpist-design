// The gate must stop the build: each case breaks one rule and expects no dist output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, loadRef, loadThemes } from "../scripts/build.mjs";
import { gate } from "../scripts/theme.mjs";

const ref = loadRef();
const paper = () => structuredClone(loadThemes()[0].data);

async function buildWith(theme) {
  const outDir = join(mkdtempSync(join(tmpdir(), "bumpist-tokens-")), "dist");
  const r = await build({ themes: [{ file: "paper.tokens.json", data: theme }], ref, outDir });
  return { ...r, wrote: existsSync(join(outDir, "tokens.css")) };
}

test("the shipped paper theme passes the gate", () => {
  assert.deepEqual(gate(paper(), ref).errors, []);
});

test("a pure white light background stops the build (UI-003)", async () => {
  const t = paper();
  t.modes.light.sys.color.bg.$value = "#FFFFFF";
  const r = await buildWith(t);
  assert.equal(r.ok, false);
  assert.equal(r.wrote, false);
  assert.ok(r.errors.some((e) => e.includes("UI-003 bg is pure white")), r.errors.join("\n"));
});

test("a radius of 8px stops the build (UI-005)", async () => {
  const t = paper();
  t.inputs.radius = 8;
  const r = await buildWith(t);
  assert.equal(r.ok, false);
  assert.equal(r.wrote, false);
  assert.ok(r.errors.some((e) => e.includes("UI-005 inputs.radius is 8")), r.errors.join("\n"));
  assert.ok(r.errors.some((e) => e.includes("UI-005 radius-control is 8px")), r.errors.join("\n"));
});

test("a low-contrast pair stops the build and names the pair", async () => {
  const t = paper();
  t.modes.light.sys.color["text-muted"].$value = "#94A3B8";
  const r = await buildWith(t);
  assert.equal(r.ok, false);
  assert.equal(r.wrote, false);
  assert.ok(r.errors.some((e) => /light: text-muted\/bg [\d.]+:1 is below 4.5:1/.test(e)), r.errors.join("\n"));
  assert.ok(r.errors.some((e) => /light: text-muted\/surface [\d.]+:1 is below 4.5:1/.test(e)), r.errors.join("\n"));
});

test("a traffic-light green positive stops the build (UI-010)", async () => {
  const t = paper();
  t.modes.light.sys.color.positive = { $value: "#15803D" };
  const r = await buildWith(t);
  assert.equal(r.ok, false);
  assert.equal(r.wrote, false);
  assert.ok(r.errors.some((e) => e.includes("UI-010 positive #15803D is not from the primary tone")), r.errors.join("\n"));
});

test("a missing focus-ring token is reported", () => {
  const t = paper();
  delete t.modes.dark.sys.color["focus-ring"];
  assert.ok(gate(t, ref).errors.some((e) => e.includes('dark: missing color token "focus-ring"')));
});
