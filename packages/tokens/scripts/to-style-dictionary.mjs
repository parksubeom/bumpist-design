// Turns resolved C1 themes into one W3C DTCG token tree ($value/$type) for Style Dictionary:
//   <theme>.color.<mode>.<name>      <theme>.shadow.<mode>.overlay
//   <theme>.radius.<control|container>   <theme>.space.<profile>.<stack|section>
const tokens = (entries, type) =>
  Object.fromEntries(entries.map(([k, v]) => [k, type ? { $type: type, $value: v } : { $value: v }]));

export function toDtcg(resolvedThemes) {
  const tree = {};
  for (const t of resolvedThemes) {
    tree[t.id] = {
      color: Object.fromEntries(Object.entries(t.colors).map(([mode, c]) => [mode, tokens(Object.entries(c), "color")])),
      shadow: Object.fromEntries(Object.entries(t.shadow).map(([mode, v]) => [mode, tokens([["overlay", v]])])),
      radius: tokens(Object.entries(t.radius)),
      space: Object.fromEntries(Object.entries(t.space).map(([profile, s]) => [profile, tokens(Object.entries(s))])),
    };
  }
  return tree;
}
