import { useEffect, useMemo, useRef, useState } from "react";
import { usePreferences } from "@/lib/preferences";
import { useT } from "@/i18n";

export type ScanFn = { name: string; vulnerable: boolean | null; confidence?: string; size: number; x?: number; z?: number };
export type ScanLayers = { ground: boolean; safe: boolean; flagged: boolean; edges: boolean };
export type ScanPhase = "idle" | "scanning" | "done";

const ALL: ScanLayers = { ground: true, safe: true, flagged: true, edges: true };
const BUCKETS = 10;
const MAX_H = 0.45;
const REVEAL = 2600;

type Placed = ScanFn & { x: number; z: number; h: number; w: number };
type Pt = { x: number; y: number; z: number; fn: number; bucket: number };

const rand = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const place = (fns: ScanFn[], edges: [number, number][]): Placed[] => {
  if (fns.length === 0) return [];
  const maxSize = Math.max(...fns.map((f) => f.size), 1);
  const w = Math.max(0.035, Math.min(0.09, 0.09 * Math.sqrt(6 / fns.length)));
  const heightOf = (f: ScanFn) => 0.12 + 0.3 * Math.sqrt(f.size / maxSize);

  if (fns.every((f) => f.x !== undefined && f.z !== undefined)) {
    return fns.map((f) => ({ ...f, x: f.x!, z: f.z!, h: heightOf(f), w }));
  }

  const order: number[] = [];
  const seen = new Set<number>();
  const neighbours = fns.map((_, i) => edges.filter(([s, t]) => s === i || t === i).map(([s, t]) => (s === i ? t : s)));
  const byDegree = fns.map((_, i) => i).sort((x, y) => neighbours[y].length - neighbours[x].length);
  for (const root of byDegree) {
    if (seen.has(root)) continue;
    const queue = [root];
    seen.add(root);
    while (queue.length) {
      const n = queue.shift()!;
      order.push(n);
      for (const m of neighbours[n]) if (m < fns.length && !seen.has(m)) { seen.add(m); queue.push(m); }
    }
  }
  const cols = Math.ceil(Math.sqrt(fns.length));
  const rows = Math.ceil(fns.length / cols);
  const span = 1.3;
  const step = span / Math.max(cols, rows);
  const cell = new Map(order.map((fn, k) => [fn, k]));
  const r = rand(11);
  return fns.map((f, i) => {
    const k = cell.get(i)!;
    const row = Math.floor(k / cols);
    const col = row % 2 ? cols - 1 - (k % cols) : k % cols;
    return {
      ...f,
      x: -((cols - 1) * step) / 2 + col * step + (r() - 0.5) * step * 0.2,
      z: -((rows - 1) * step) / 2 + row * step + (r() - 0.5) * step * 0.2,
      h: heightOf(f),
      w: Math.min(w, step * 0.32),
    };
  });
};

const build = (fns: Placed[], edges: [number, number][]): Pt[] => {
  const r = rand(7);
  const pts: Pt[] = [];
  const push = (x: number, y: number, z: number, fn: number) =>
    pts.push({ x, y, z, fn, bucket: Math.min(BUCKETS - 1, Math.floor((y / MAX_H) * BUCKETS)) });

  for (let i = 0; i < 84; i++) {
    for (let j = 0; j < 84; j++) {
      const x = -1.1 + (i / 83) * 2.2 + (r() - 0.5) * 0.03;
      const z = -1.1 + (j / 83) * 2.2 + (r() - 0.5) * 0.03;
      const d = Math.hypot(x, z);
      if (d > 1.05 || r() < Math.max(0, (d - 0.55) / 0.5)) continue;
      push(x, Math.max(0, 0.025 * Math.sin(x * 3.1) * Math.cos(z * 2.3) + 0.012 * r()), z, -1);
    }
  }

  const per = fns.length ? Math.max(150, Math.min(1600, 9000 / fns.length)) : 0;
  fns.forEach((f, fi) => {
    const count = Math.round(per * (0.5 + f.h));
    for (let k = 0; k < count; k++) {
      const face = Math.floor(r() * 5);
      const a = (r() * 2 - 1) * f.w;
      const b = r();
      if (face === 4) push(f.x + a, f.h, f.z + (r() * 2 - 1) * f.w, fi);
      else if (face === 0) push(f.x + a, b * f.h, f.z - f.w, fi);
      else if (face === 1) push(f.x + a, b * f.h, f.z + f.w, fi);
      else if (face === 2) push(f.x - f.w, b * f.h, f.z + a, fi);
      else push(f.x + f.w, b * f.h, f.z + a, fi);
    }
  });

  edges.forEach(([s, t]) => {
    const a = fns[s], b = fns[t];
    if (!a || !b || s === t) return;
    for (let k = 0; k <= 40; k++) {
      const u = k / 40;
      push(a.x + (b.x - a.x) * u, 0.03 + Math.sin(u * Math.PI) * 0.05, a.z + (b.z - a.z) * u, -2);
    }
  });
  return pts;
};

const parseOklch = (value: string) => {
  const m = value.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [60, 0.03, 235];
};
const mix = (a: number[], b: number[], t: number) => `oklch(${a[0] + (b[0] - a[0]) * t}% ${a[1] + (b[1] - a[1]) * t} ${a[2] + (b[2] - a[2]) * t})`;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface PointScanProps {
  functions?: ScanFn[];
  edges?: [number, number][];
  phase?: ScanPhase;
  verdict?: "vulnerable" | "safe" | null;
  replay?: boolean;
  callouts?: number;
  layers?: ScanLayers;
  caption: string;
  label: string;
  size?: "sm" | "md" | "lg";
}

export const PointScan = ({
  functions = [],
  edges = [],
  phase = "idle",
  verdict = null,
  replay = false,
  callouts = 2,
  layers = ALL,
  caption,
  label,
  size = "md",
}: PointScanProps) => {
  const { animateScans } = usePreferences();
  const t = useT();
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calloutRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [held, setHeld] = useState(false);
  const heldRef = useRef(held);
  heldRef.current = held;
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const redrawRef = useRef<() => void>(() => {});

  const placed = useMemo(() => place(functions, edges), [functions, edges]);
  const points = useMemo(() => build(placed, edges), [placed, edges]);
  const marked = useMemo(
    () => placed
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.vulnerable)
      .sort((a, b) => Number(b.f.confidence ?? 0) - Number(a.f.confidence ?? 0))
      .slice(0, callouts),
    [placed, callouts],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const figure = figureRef.current;
    if (!canvas || !figure) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const css = getComputedStyle(document.documentElement);
    const lo = parseOklch(css.getPropertyValue("--point-lo"));
    const midC = parseOklch(css.getPropertyValue("--point-mid"));
    const hi = parseOklch(css.getPropertyValue("--point-hi"));
    const bad = css.getPropertyValue("--color-bad").trim();
    const ok = css.getPropertyValue("--color-ok").trim();
    const hiColor = mix(hi, hi, 0);
    const colours = Array.from({ length: BUCKETS }, (_, i) => {
      const t = i / (BUCKETS - 1);
      return t < 0.5 ? mix(lo, midC, t * 2) : mix(midC, hi, (t - 0.5) * 2);
    });
    const byBucket = Array.from({ length: BUCKETS }, () => [] as Pt[]);
    points.forEach((p) => byBucket[p.bucket].push(p));

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || !animateScans;
    const cycle = phase === "scanning" ? 2400 : 7000;
    const groundVerdict = phase === "done" && placed.length === 0 && verdict ? (verdict === "safe" ? ok : bad) : null;

    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();

    const pitch = 0.62;
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    const project = (x: number, y: number, z: number, cosT: number, sinT: number) => {
      const xr = x * cosT - z * sinT;
      const zr = x * sinT + z * cosT;
      const yy = y * cosP - zr * sinP;
      const zz = y * sinP + zr * cosP;
      const s = 2.6 / (2.6 + zz);
      const scale = Math.min(w, h * 1.3) * 0.46;
      return { sx: w * 0.5 + xr * s * scale, sy: h * 0.56 - yy * s * scale, s };
    };

    const visibleOf = (p: Pt) => {
      const l = layersRef.current;
      if (p.fn === -1) return l.ground;
      if (p.fn === -2) return l.edges;
      return placed[p.fn].vulnerable ? l.flagged : l.safe;
    };

    let clock = 0;
    let revealed = -Infinity;

    const draw = () => {
      const theta = 0.5 + (reduce ? 0 : (clock / 120000) * Math.PI * 2);
      const firstPass = phase === "done" && !replay && !reduce;
      let sweep: number;
      if (firstPass && clock < REVEAL) {
        sweep = -1.2 + easeInOut(clock / REVEAL) * 2.4;
        revealed = Math.max(revealed, sweep);
      } else {
        const t = reduce ? (phase === "done" ? 1 : 0.5) : ((clock - (firstPass ? REVEAL : 0)) % cycle) / cycle;
        sweep = phase === "idle" && reduce ? -9 : -1.2 + easeInOut(t) * 2.4;
        if (phase === "done") revealed = replay ? sweep : Infinity;
      }
      const cosT = Math.cos(theta), sinT = Math.sin(theta);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const lit: number[] = [];
      const red: number[] = [];
      const green: number[] = [];

      byBucket.forEach((bucket, bi) => {
        ctx.fillStyle = colours[bi];
        for (const p of bucket) {
          if (!visibleOf(p)) continue;
          const { sx, sy, s } = project(p.x, p.y, p.z, cosT, sinT);
          const r = (p.fn === -1 ? 1.1 : 1.3) * s;
          if (phase === "done" && p.x < revealed) {
            if (p.fn >= 0 && placed[p.fn].vulnerable !== null) { (placed[p.fn].vulnerable ? red : green).push(sx, sy, r); continue; }
            if (p.fn === -1 && groundVerdict) { (verdict === "safe" ? green : red).push(sx, sy, r); continue; }
          }
          if (Math.abs(p.x - sweep) < 0.05) { lit.push(sx, sy, r); continue; }
          ctx.fillRect(sx, sy, r, r);
        }
      });

      const paint = (arr: number[], colour: string, k: number) => {
        ctx.fillStyle = colour;
        for (let i = 0; i < arr.length; i += 3) ctx.fillRect(arr[i], arr[i + 1], arr[i + 2] * k, arr[i + 2] * k);
      };
      paint(lit, hiColor, 1.4);
      paint(green, ok, 1.1);
      paint(red, bad, 1.2);

      const spots = marked.map(({ f }) => ({ f, ...project(f.x, f.h, f.z, cosT, sinT) }));
      const rank = spots.map((p, i) => ({ i, sx: p.sx })).sort((x, y) => x.sx - y.sx).map((p) => p.i);
      spots.forEach(({ f, sx, sy }, i) => {
        const el = calloutRefs.current[i];
        if (!el) return;
        el.style.transform = `translate(${sx}px, ${sy}px)`;
        el.dataset.side = sx > w * 0.55 ? "left" : "right";
        el.style.setProperty("--lift", `${Math.max(76, sy - (12 + rank.indexOf(i) * 64))}px`);
        el.dataset.found = String(phase === "done" && f.x < revealed && layersRef.current.flagged);
      });
    };

    let raf = 0;
    let hover = false;
    let last = 0;
    const loop = (now: number) => {
      const dt = last ? now - last : 0;
      last = now;
      if (!heldRef.current && !hover) clock += dt;
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(loop); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    draw();
    redrawRef.current = draw;
    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else stop(); });
    io.observe(figure);
    const onEnter = () => { hover = true; };
    const onLeave = () => { hover = false; };
    figure.addEventListener("pointerenter", onEnter);
    figure.addEventListener("pointerleave", onLeave);
    figure.addEventListener("focusin", onEnter);
    figure.addEventListener("focusout", onLeave);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      figure.removeEventListener("pointerenter", onEnter);
      figure.removeEventListener("pointerleave", onLeave);
      figure.removeEventListener("focusin", onEnter);
      figure.removeEventListener("focusout", onLeave);
    };
  }, [points, placed, marked, phase, verdict, replay, animateScans]);

  useEffect(() => {
    redrawRef.current();
  }, [layers]);

  return (
    <figure ref={figureRef} className={`scan scan--${size}`} data-kind="product">
      <div className="scan__stage">
        <canvas ref={canvasRef} className="scan__canvas" role="img" aria-label={label} />
        {marked.map(({ f }, i) => (
          <div key={f.name} ref={(el) => (calloutRefs.current[i] = el)} className="scan__callout" data-found="false" data-side="right" aria-hidden="true">
            <span className="scan__leader" />
            <span className="scan__label">
              <span className="block text-xs text-muted-foreground">{f.name}</span>
              <span className="measured block text-base text-ink">{f.confidence}</span>
            </span>
          </div>
        ))}
      </div>
      <figcaption className="scan__caption">
        <span>{caption}</span>
        <button type="button" className="scan__toggle" onClick={() => setHeld((v) => !v)} aria-pressed={held}>
          {held ? t("Play scan") : t("Pause scan")}
        </button>
      </figcaption>
    </figure>
  );
};
