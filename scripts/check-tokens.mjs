// Phase-0 guard for design principles UI-003 and UI-005 (bumpist-design 4-0).
// Fails if a theme uses pure white/black for bg/text or a radius other than 12/16.
// The full contrast gate (WCAG) replaces this in phase 1.
import { readdirSync, readFileSync } from "node:fs";

const dir = "packages/tokens/src/themes";
let failed = 0;
for (const f of readdirSync(dir).filter((n) => n.endsWith(".tokens.json"))) {
  const t = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  const errs = [];
  for (const [mode, m] of Object.entries(t.modes ?? {})) {
    const c = m.sys?.color ?? {};
    const bg = c.bg?.$value?.toUpperCase();
    const text = c.text?.$value?.toUpperCase();
    if (mode === "light" && bg === "#FFFFFF") errs.push("UI-003 light bg is pure white");
    if (mode === "light" && text === "#000000") errs.push("UI-003 light text is pure black");
    if (mode === "dark" && bg === "#000000") errs.push("UI-003 dark bg is pure black");
    if (mode === "dark" && text === "#FFFFFF") errs.push("UI-003 dark text is pure white");
  }
  if (![12, 16].includes(t.inputs?.radius)) errs.push("UI-005 radius must be 12 or 16");
  if (errs.length) { failed++; console.error(`✗ ${f}: ${errs.join("; ")}`); } else console.log(`✓ ${f}`);
}
if (failed) process.exit(1);
