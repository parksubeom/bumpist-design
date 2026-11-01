import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, hexToOklch, hueDistance, lightnessForContrast, oklchToHex } from "../scripts/color.mjs";

const near = (actual, expected, tolerance, msg) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${msg}: ${actual} is not within ${tolerance} of ${expected}`);

test("contrast matches known WCAG pairs", () => {
  near(contrast("#000000", "#FFFFFF"), 21, 0.001, "black on white");
  near(contrast("#FFFFFF", "#FFFFFF"), 1, 0.001, "white on white");
  near(contrast("#767676", "#FFFFFF"), 4.54, 0.01, "#767676 on white (the classic AA gray)");
  near(contrast("#777777", "#FFFFFF"), 4.48, 0.01, "#777777 on white (just below AA)");
  near(contrast("#0000FF", "#FFFFFF"), 8.59, 0.01, "blue on white");
  assert.equal(contrast("#123456", "#ABCDEF"), contrast("#ABCDEF", "#123456"), "order does not matter");
});

test("hex survives a round trip through OKLCH", () => {
  for (const hex of ["#6366F1", "#F43F5E", "#F8FAFC", "#0B1120", "#16A34A"]) assert.equal(oklchToHex(hexToOklch(hex)), hex);
});

test("lightnessForContrast reaches the target and keeps the hue", () => {
  const out = lightnessForContrast("#6366F1", "#F8FAFC", 4.5);
  assert.ok(contrast(out, "#F8FAFC") >= 4.5);
  assert.ok(hueDistance(hexToOklch(out).h, hexToOklch("#6366F1").h) < 1);
  assert.equal(lightnessForContrast("#0F172A", "#F8FAFC", 4.5), "#0F172A", "a passing color is returned unchanged");
});
