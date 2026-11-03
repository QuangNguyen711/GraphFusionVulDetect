import { useRef, useState } from "react";
import { SAMPLE_FUNCTIONS, SAMPLE_EDGES } from "./sample";
import { useT } from "@/i18n";

const toPlan = (v: number) => 50 + v * 62;

const nearest = (cut: number) =>
  SAMPLE_FUNCTIONS.reduce((best, f, i) =>
    Math.abs(toPlan(f.x) - cut) < Math.abs(toPlan(SAMPLE_FUNCTIONS[best].x) - cut) ? i : best, 0);

export const FunctionCut = () => {
  const t = useT();
  const [cut, setCut] = useState(toPlan(SAMPLE_FUNCTIONS[0].x));
  const planRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const index = nearest(cut);
  const fn = SAMPLE_FUNCTIONS[index];
  const calls = SAMPLE_EDGES.filter(([s]) => s === index).map(([, t]) => SAMPLE_FUNCTIONS[t].name.split("(")[0]);
  const calledBy = SAMPLE_EDGES.filter(([, t]) => t === index).map(([s]) => SAMPLE_FUNCTIONS[s].name.split("(")[0]);

  const fromPointer = (clientX: number) => {
    const box = planRef.current?.getBoundingClientRect();
    if (!box) return;
    setCut(Math.max(0, Math.min(100, ((clientX - box.left) / box.width) * 100)));
  };

  return (
    <div className="cut">
      <figure className="cut__plan ticks">
        <svg
          ref={planRef}
          viewBox="0 0 100 100"
          className="cut__svg"
          role="group"
          aria-label={t("Plan of the sample contract’s call graph, seen from above")}
          onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); fromPointer(e.clientX); }}
          onPointerMove={(e) => { if (dragging.current) fromPointer(e.clientX); }}
          onPointerUp={() => { dragging.current = false; }}
        >
          {SAMPLE_EDGES.map(([s, t]) => (
            <line
              key={`${s}-${t}`}
              className="cut__edge"
              x1={toPlan(SAMPLE_FUNCTIONS[s].x)} y1={toPlan(SAMPLE_FUNCTIONS[s].z)}
              x2={toPlan(SAMPLE_FUNCTIONS[t].x)} y2={toPlan(SAMPLE_FUNCTIONS[t].z)}
            />
          ))}
          {SAMPLE_FUNCTIONS.map((f, i) => {
            const size = 6 + f.h * 14;
            return (
              <rect
                key={f.name}
                className={`cut__block${f.vulnerable ? " is-flagged" : ""}${i === index ? " is-cut" : ""}`}
                x={toPlan(f.x) - size / 2} y={toPlan(f.z) - size / 2} width={size} height={size} rx={0.8}
              />
            );
          })}
          <line className="cut__line" x1={cut} y1={2} x2={cut} y2={98} />
        </svg>
        <label className="cut__range">
          <span className="sr-only">{t("Cut line position")}</span>
          <input type="range" min={0} max={100} step={1} value={Math.round(cut)} onChange={(e) => setCut(Number(e.target.value))} />
        </label>
        <figcaption className="lp-caption">{t("Drag the line, or use the arrow keys, to cut through a function")}</figcaption>
      </figure>

      <div className="cut__read">
        <dl className="cut__facts">
          <div><dt>{t("Function")}</dt><dd className="code-text">{fn.name}</dd></div>
          <div><dt>{t("Verdict")}</dt><dd className={fn.vulnerable ? "text-bad" : "text-ok"}>{fn.vulnerable ? t("Vulnerable") : t("Safe")}</dd></div>
          <div><dt>{t("Confidence")}</dt><dd className="measured">{fn.confidence}</dd></div>
          <div><dt>{t("Calls")}</dt><dd className="code-text">{calls.length ? calls.join(", ") : t("none")}</dd></div>
          <div><dt>{t("Called by")}</dt><dd className="code-text">{calledBy.length ? calledBy.join(", ") : t("none")}</dd></div>
        </dl>
        <pre className="code-text cut__code" aria-live="polite">{fn.code}</pre>
      </div>
    </div>
  );
};
