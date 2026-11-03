import { SAMPLE_FUNCTIONS, SAMPLE_EDGES, ALL_LAYERS, Layers } from "./sample";
import { useEffect, useRef, useState } from "react";

const FUNCTIONS = SAMPLE_FUNCTIONS;
const EDGES = SAMPLE_EDGES;

type Pt = { x: number; y: number; z: number; fn: number; bucket: number };

const BUCKETS = 10;
const MAX_H = 0.45;
const CYCLE = 7000;

const rand = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const buildPoints = (): Pt[] => {
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
      const y = 0.025 * Math.sin(x * 3.1) * Math.cos(z * 2.3) + 0.012 * r();
      push(x, Math.max(0, y), z, -1);
    }
  }

  FUNCTIONS.forEach((f, fi) => {
    const w = 0.09;
    const count = Math.round(500 + f.h * 1600);
    for (let k = 0; k < count; k++) {
      const face = Math.floor(r() * 5);
      const a = (r() * 2 - 1) * w;
      const b = r();
      if (face === 4) push(f.x + a, f.h, f.z + (r() * 2 - 1) * w, fi);
      else if (face === 0) push(f.x + a, b * f.h, f.z - w, fi);
      else if (face === 1) push(f.x + a, b * f.h, f.z + w, fi);
      else if (face === 2) push(f.x - w, b * f.h, f.z + a, fi);
      else push(f.x + w, b * f.h, f.z + a, fi);
    }
  });

  EDGES.forEach(([s, t]) => {
    const a = FUNCTIONS[s], b = FUNCTIONS[t];
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

interface ScanCloudProps {
  layers?: Layers;
  callouts?: boolean;
  caption: string;
  label: string;
  tall?: boolean;
}

export const ScanCloud = ({ layers = ALL_LAYERS, callouts = true, caption, label, tall = false }: ScanCloudProps) => {
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const redrawRef = useRef<() => void>(() => {});
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calloutRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [held, setHeld] = useState(false);
  const heldRef = useRef(held);
  heldRef.current = held;

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
    const found = css.getPropertyValue("--color-bad").trim();
    const cleared = css.getPropertyValue("--color-ok").trim();
    const hiColor = mix(hi, hi, 0);
    const colours = Array.from({ length: BUCKETS }, (_, i) => {
      const t = i / (BUCKETS - 1);
      return t < 0.5 ? mix(lo, midC, t * 2) : mix(midC, hi, (t - 0.5) * 2);
    });

    const pts = buildPoints();
    const byBucket = Array.from({ length: BUCKETS }, () => [] as Pt[]);
    pts.forEach((p) => byBucket[p.bucket].push(p));

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(() => { resize(); draw(lastT); });
    ro.observe(canvas);

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

    let lastT = 0;
    let clock = 0;
    const visibleOf = (p: Pt) => {
      const l = layersRef.current;
      if (p.fn === -1) return l.ground;
      if (p.fn === -2) return l.edges;
      return FUNCTIONS[p.fn].vulnerable ? l.flagged : l.safe;
    };

    const draw = (time: number) => {
      lastT = time;
      const theta = 0.5 + (reduce ? 0 : (clock / 120000) * Math.PI * 2);
      const phase = reduce ? 0.78 : (clock % CYCLE) / CYCLE;
      const sweep = -1.2 + easeInOut(phase) * 2.4;
      const cosT = Math.cos(theta), sinT = Math.sin(theta);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const lit: { sx: number; sy: number; r: number }[] = [];
      const foundPts: { sx: number; sy: number; r: number }[] = [];
      const clearedPts: { sx: number; sy: number; r: number }[] = [];

      byBucket.forEach((bucket, bi) => {
        ctx.fillStyle = colours[bi];
        for (const p of bucket) {
          if (!visibleOf(p)) continue;
          const { sx, sy, s } = project(p.x, p.y, p.z, cosT, sinT);
          const r = (p.fn === -1 ? 1.1 : 1.3) * s;
          if (p.fn >= 0 && sweep > FUNCTIONS[p.fn].x) { (FUNCTIONS[p.fn].vulnerable ? foundPts : clearedPts).push({ sx, sy, r }); continue; }
          if (Math.abs(p.x - sweep) < 0.05) { lit.push({ sx, sy, r }); continue; }
          ctx.fillRect(sx, sy, r, r);
        }
      });

      ctx.fillStyle = hiColor;
      for (const p of lit) ctx.fillRect(p.sx, p.sy, p.r * 1.4, p.r * 1.4);
      ctx.fillStyle = cleared;
      for (const p of clearedPts) ctx.fillRect(p.sx, p.sy, p.r * 1.1, p.r * 1.1);
      ctx.fillStyle = found;
      for (const p of foundPts) ctx.fillRect(p.sx, p.sy, p.r * 1.2, p.r * 1.2);

      FUNCTIONS.filter((f) => f.vulnerable).forEach((f, i) => {
        const el = calloutRefs.current[i];
        if (!el) return;
        const { sx, sy } = project(f.x, f.h, f.z, cosT, sinT);
        el.style.transform = `translate(${sx}px, ${sy}px)`;
        el.dataset.found = String(sweep > f.x && layersRef.current.flagged);
      });
    };

    let raf = 0;
    let hover = false;
    let last = 0;
    const loop = (t: number) => {
      const dt = last ? t - last : 0;
      last = t;
      if (!heldRef.current && !hover) clock += dt;
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(loop); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    draw(0);
    redrawRef.current = () => draw(lastT);
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
  }, []);

  useEffect(() => {
    redrawRef.current();
  }, [layers]);

  const vulnerable = callouts ? FUNCTIONS.filter((f) => f.vulnerable) : [];

  return (
    <figure ref={figureRef} className={tall ? "scan scan--tall" : "scan"} data-kind="product">
      <div className="scan__stage">
        <canvas
          ref={canvasRef}
          className="scan__canvas"
          role="img"
          aria-label={label}
        />
        {vulnerable.map((f, i) => (
          <div key={f.name} ref={(el) => (calloutRefs.current[i] = el)} className="scan__callout" data-found="false" aria-hidden="true">
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
          {held ? "Play scan" : "Pause scan"}
        </button>
      </figcaption>
    </figure>
  );
};
