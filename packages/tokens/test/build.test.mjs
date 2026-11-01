// Builds the real themes into a temp folder and checks the three outputs.
// Update the snapshot after an intended change with: UPDATE_SNAPSHOTS=1 pnpm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PKG, build, loadRef, loadThemes } from "../scripts/build.mjs";
import { TAILWIND_MAP } from "../scripts/formats.mjs";

const outDir = join(mkdtempSync(join(tmpdir(), "bumpist-tokens-")), "dist");
const themes = loadThemes();
const result = await build({ themes, ref: loadRef(), outDir });
const read = (name) => readFileSync(join(outDir, name), "utf8").replace(/\r\n/g, "\n");

test("the build passes the gate", () => {
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("dist/tokens.css matches the snapshot", () => {
  const snapshot = join(PKG, "test/__snapshots__/tokens.css");
  if (process.env.UPDATE_SNAPSHOTS) writeFileSync(snapshot, read("tokens.css"));
  assert.equal(read("tokens.css"), readFileSync(snapshot, "utf8").replace(/\r\n/g, "\n"));
});

test("tokens.css defaults to light mode and the consumer profile", () => {
  const css = read("tokens.css");
  assert.match(css, /:root\[data-theme="paper"\],\n:root\[data-theme="paper"\]\[data-mode="light"\] \{/);
  assert.match(css, /:root\[data-theme="paper"\]\[data-mode="dark"\] \{/);
  assert.match(css, /:root\[data-theme="paper"\],\n\[data-theme="paper"\] \[data-profile="consumer"\]/);
  assert.match(css, /\[data-theme="paper"\] \[data-profile="workspace"\]/);
});

test("tailwind.css resets defaults and maps only Bumpist tokens", () => {
  const css = read("tailwind.css");
  assert.match(css, /@theme inline \{/);
  for (const reset of ["--color-*", "--radius-*", "--shadow-*"]) assert.ok(css.includes(`  ${reset}: initial;`), reset);
  for (const [tw, src] of TAILWIND_MAP) assert.ok(css.includes(`  ${tw}: var(--bp-sys-${src});`), tw);
  const radii = css.match(/--radius-[a-z-]+(?=:)/g).filter((n) => n !== "--radius-*");
  assert.deepEqual(radii, ["--radius-control", "--radius-container"]);
});

test("tokens.json resolves every mode and profile", () => {
  const json = JSON.parse(read("tokens.json"));
  for (const mode of ["light", "dark"])
    for (const profile of ["consumer", "workspace"]) {
      const v = json.paper[mode][profile];
      assert.match(v.color.bg, /^#[0-9A-F]{6}$/);
      assert.equal(v.radius.control, "12px");
      assert.ok(v.shadow.overlay);
      assert.ok(v.space.stack && v.space.section);
    }
  assert.equal(json.paper.light.workspace.space.stack, "16px");
  assert.equal(json.paper.light.consumer.space.stack, "24px");
});

test("the contrast recorded in each theme file is up to date", () => {
  for (const r of result.results)
    assert.deepEqual(r.theme.contrast, r.contrast, `${r.id}: run pnpm build to refresh the contrast array`);
});
