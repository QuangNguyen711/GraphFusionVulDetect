import type { ScanFn } from "./PointScan";

export const previewFromSource = (source: string): { functions: ScanFn[]; edges: [number, number][] } => {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const re = /\bfunction\s+([A-Za-z_]\w*)\s*\(/g;
  const found: { name: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) found.push({ name: m[1], start: m.index });

  const bodies = found.map((f, i) => clean.slice(f.start, found[i + 1]?.start ?? clean.length));
  const functions: ScanFn[] = found.map((f, i) => ({ name: f.name, vulnerable: null, size: bodies[i].length }));

  const edges: [number, number][] = [];
  found.forEach((caller, i) => {
    const body = bodies[i].slice(bodies[i].indexOf("{") + 1);
    found.forEach((callee, j) => {
      if (i !== j && new RegExp(`\\b${callee.name}\\s*\\(`).test(body)) edges.push([i, j]);
    });
  });
  return { functions: functions.slice(0, 80), edges: edges.filter(([s, t]) => s < 80 && t < 80) };
};
