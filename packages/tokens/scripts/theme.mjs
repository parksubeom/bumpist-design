// Resolves a C1 theme into every value the build writes, and runs the build gate:
// WCAG contrast pairs, UI-003 (no pure white/black), UI-005 (radius 12/16), UI-010 (status color sources).
import { contrast, hexToOklch, hueDistance, lightnessForContrast, luminance, oklchToHex } from "./color.mjs";

export const MODES = ["light", "dark"];
export const PROFILES = ["consumer", "workspace"];

// [foreground, background, minimum ratio]
export const CONTRAST_PAIRS = [
  ["text", "bg", 4.5],
  ["text", "surface", 4.5],
  ["text-muted", "bg", 4.5],
  ["text-muted", "surface", 4.5],
  ["primary-fg", "primary", 4.5],
  ["accent-fg", "accent", 4.5],
  ["positive", "bg", 4.5],
  ["notice", "bg", 4.5],
  ["negative", "bg", 4.5],
  ["text", "input", 4.5],
  ["focus-ring", "bg", 3],
  ["input", "bg", 3],
];

// UI-010: status colors come from a brand tone with only the OKLCH lightness changed.
export const STATUS_SOURCE = { positive: "primary", notice: "accent", negative: "accent" };
const STATUS_STEP = 0.06; // status colors sit this much further from bg than their source, so they never equal it
const NEGATIVE_STEP = 0.12; // negative sits this much further from bg than notice, so the two differ
const HUE_TOLERANCE = 2; // degrees; gamut mapping can nudge the hue slightly

const REQUIRED = ["bg", "surface", "surface-raised", "text", "text-muted", "primary", "primary-fg", "accent", "accent-fg", "focus-ring", "input"];
const RADII = [12, 16];

const px = (v) => Number.parseFloat(String(v));

// Source tone with only its OKLCH lightness moved: first to where it reaches 4.5:1 on bg,
// then `step` further away from bg (darker on light backgrounds, lighter on dark ones).
function statusFrom(source, bg, step) {
  const src = hexToOklch(source);
  const away = luminance(bg) > 0.18 ? -1 : 1;
  const base = hexToOklch(lightnessForContrast(source, bg, 4.5)).l;
  const l = Math.min(0.98, Math.max(0.02, base + away * step));
  return oklchToHex({ l, c: src.c, h: src.h });
}

function deriveStatus(c) {
  return {
    positive: c.positive ?? statusFrom(c.primary, c.bg, STATUS_STEP),
    notice: c.notice ?? statusFrom(c.accent, c.bg, STATUS_STEP),
    negative: c.negative ?? statusFrom(c.accent, c.bg, STATUS_STEP + NEGATIVE_STEP),
  };
}

export function resolveTheme(theme, ref) {
  const errors = [];
  const fail = (msg) => errors.push(`${theme.id}${msg}`);
  const colors = {};
  const shadow = {};

  for (const mode of MODES) {
    const sys = theme.modes?.[mode]?.sys?.color ?? {};
    const c = Object.fromEntries(Object.entries(sys).map(([k, v]) => [k, String(v.$value).toUpperCase()]));
    for (const name of REQUIRED) if (!c[name]) fail(` ${mode}: missing color token "${name}"`);
    if (REQUIRED.some((n) => !c[n])) continue;
    colors[mode] = { ...c, ...deriveStatus(c) };
    shadow[mode] = ref.ref.shadow.overlay[mode].$value;
  }

  const radius = { control: `${theme.inputs?.radius}px`, container: ref.ref.radius["2xl"].$value };
  const space = Object.fromEntries(
    PROFILES.map((p) => [p, { stack: theme.profiles?.[p]?.gap, section: theme.profiles?.[p]?.section }]),
  );
  return { id: theme.id, colors, radius, shadow, space, errors };
}

export function gate(theme, ref) {
  const resolved = resolveTheme(theme, ref);
  const { colors, radius } = resolved;
  const errors = [...resolved.errors];
  const fail = (msg) => errors.push(`${theme.id}${msg}`);
  const results = [];

  for (const mode of Object.keys(colors)) {
    const c = colors[mode];
    for (const [fg, bg, min] of CONTRAST_PAIRS) {
      const ratio = Math.round(contrast(c[fg], c[bg]) * 100) / 100;
      const pass = contrast(c[fg], c[bg]) >= min;
      results.push({ mode, fg, bg, ratio, pass });
      if (!pass) fail(` ${mode}: ${fg}/${bg} ${ratio}:1 is below ${min}:1 (contrast)`);
    }

    // UI-003: no pure white or pure black where people read
    const white = "#FFFFFF";
    const black = "#000000";
    if (mode === "light") {
      for (const n of ["bg", "surface", "surface-raised"]) if (c[n] === white) fail(` light: UI-003 ${n} is pure white (${white})`);
      if (c.text === black) fail(` light: UI-003 text is pure black (${black})`);
    } else {
      for (const n of ["bg", "surface", "surface-raised"]) if (c[n] === black) fail(` dark: UI-003 ${n} is pure black (${black})`);
      if (c.text === white) fail(` dark: UI-003 text is pure white (${white})`);
    }

    // UI-010: each status color keeps its source tone's hue; only lightness moves
    for (const [status, source] of Object.entries(STATUS_SOURCE)) {
      const s = hexToOklch(c[status]);
      const src = hexToOklch(c[source]);
      const d = hueDistance(s.h, src.h);
      if (d > HUE_TOLERANCE || s.c > src.c + 0.01)
        fail(` ${mode}: UI-010 ${status} ${c[status]} is not from the ${source} tone (hue ${s.h.toFixed(1)}° vs ${src.h.toFixed(1)}°)`);
    }
  }

  // UI-005: radius 12 or 16 only
  if (!RADII.includes(theme.inputs?.radius)) fail(`: UI-005 inputs.radius is ${theme.inputs?.radius}, must be 12 or 16`);
  for (const [k, v] of Object.entries(radius)) if (!RADII.includes(px(v))) fail(`: UI-005 radius-${k} is ${v}, must be 12px or 16px`);

  return { ...resolved, contrast: results, errors };
}
