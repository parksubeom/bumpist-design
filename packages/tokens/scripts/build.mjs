// Token build: gate every theme, then let Style Dictionary write dist/tokens.css, tailwind.css and tokens.json.
// A theme that breaks a contrast pair or UI-003/005/010 stops the build before anything is written.
// On success the contrast results are recorded in each theme file's `contrast` array (C1).
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import StyleDictionary from "style-dictionary";
import { registerFormats } from "./formats.mjs";
import { gate } from "./theme.mjs";
import { toDtcg } from "./to-style-dictionary.mjs";

export const PKG = join(dirname(fileURLToPath(import.meta.url)), "..");
// dist file → Style Dictionary format (formats.mjs)
export const OUTPUTS = {
  "tokens.css": "bumpist/css",
  "tailwind.css": "bumpist/tailwind",
  "tokens.json": "bumpist/json",
};
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

export const loadRef = () => readJson(join(PKG, "src/ref.tokens.json"));
export function loadThemes(dir = join(PKG, "src/themes")) {
  return readdirSync(dir)
    .filter((n) => n.endsWith(".tokens.json"))
    .sort()
    .map((n) => ({ file: join(dir, n), data: readJson(join(dir, n)) }));
}

export async function build({ themes, ref, outDir }) {
  const results = themes.map((t) => ({ file: t.file, theme: t.data, ...gate(t.data, ref) }));
  const errors = results.flatMap((r) => r.errors);
  if (errors.length) return { ok: false, errors, results };

  registerFormats(StyleDictionary);
  // Remove only our own outputs. rmSync({ recursive: true }) crashes Node 24 on Windows paths with non-ASCII characters.
  for (const name of Object.keys(OUTPUTS)) if (existsSync(join(outDir, name))) unlinkSync(join(outDir, name));
  const sd = new StyleDictionary({
    tokens: toDtcg(results),
    log: { verbosity: "silent" },
    platforms: {
      bumpist: {
        buildPath: `${outDir.replace(/\\/g, "/")}/`,
        files: Object.entries(OUTPUTS).map(([destination, format]) => ({ destination, format })),
      },
    },
  });
  await sd.buildAllPlatforms();
  return { ok: true, errors: [], results };
}

// The theme file with its `contrast` array replaced by this build's results.
export function withContrast(theme, contrast) {
  const { contrast: _old, ...rest } = theme;
  return { ...rest, contrast };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const r = await build({ themes: loadThemes(), ref: loadRef(), outDir: join(PKG, "dist") });
  if (!r.ok) {
    console.error("✗ token build stopped by the gate:");
    for (const e of r.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  for (const res of r.results) {
    writeFileSync(res.file, `${JSON.stringify(withContrast(res.theme, res.contrast), null, 2)}\n`);
    console.log(`✓ ${res.id}: ${res.contrast.length} contrast pairs pass, UI-003/005/010 pass`);
  }
  console.log("✓ dist/tokens.css, dist/tailwind.css, dist/tokens.json");
}
