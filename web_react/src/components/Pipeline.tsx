import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export const STAGES = [
  { node: "convert_to_fcg", title: "Function Call Graph Generation", note: "Builds the call graph of every function in the contract." },
  { node: "detect_vulnerability_src", title: "Source Code Vulnerability Detection", note: "Classifies the whole contract from its source." },
  { node: "detect_vulnerability_func", title: "Function-level Vulnerability Detection", note: "Scores each function in the graph. Runs only when the contract is flagged." },
  { node: "explain_vulnerability_func", title: "Vulnerability Explanation", note: "Explains each flagged function. Runs only when the contract is flagged." },
] as const;

export type StageState = "pending" | "running" | "done" | "skipped" | "error";

export interface StageResult {
  node: string;
  status?: string;
  output?: any;
  timestamp?: string;
}

const STATE_LABEL: Record<StageState, string> = {
  pending: "Waiting",
  running: "Running",
  done: "Done",
  skipped: "Skipped, contract not flagged",
  error: "Stopped",
};

export const getStageStates = (results: StageResult[], isStreaming: boolean): StageState[] => {
  const byNode = new Map(results.map((r) => [r.node, r]));
  const src = byNode.get("detect_vulnerability_src")?.output;
  const hasError = results.some((r) => r.node === "error");
  let claimed = false;

  return STAGES.map((stage, index) => {
    if (byNode.has(stage.node)) return "done";
    if (index >= 2 && src && src.predicted_class !== "Vulnerable") return "skipped";
    if (claimed) return "pending";
    if (hasError) { claimed = true; return "error"; }
    if (isStreaming) { claimed = true; return "running"; }
    return "pending";
  });
};

const formatTime = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

interface PipelineTrailProps {
  results?: StageResult[];
  isStreaming?: boolean;
  renderDetail?: (result: StageResult) => ReactNode;
  preview?: boolean;
}

export const PipelineTrail = ({ results = [], isStreaming = false, renderDetail, preview = false }: PipelineTrailProps) => {
  const states = getStageStates(results, isStreaming);
  const settled = states.filter((s) => s === "done" || s === "skipped").length;
  const byNode = new Map(results.map((r) => [r.node, r]));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const collapsible = Boolean(renderDetail) && !preview;
  const withDetail = STAGES.filter((stage) => byNode.has(stage.node)).map((stage) => stage.node);
  const allCollapsed = withDetail.length > 0 && withDetail.every((node) => collapsed.has(node));

  const toggle = (node: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(node)) next.delete(node);
      else next.add(node);
      return next;
    });

  return (
    <div>
      {collapsible && withDetail.length > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            className="trail__all"
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(withDetail))}
          >
            {allCollapsed ? "Expand all steps" : "Collapse all steps"}
          </button>
        </div>
      )}
    <div className="trail" style={{ "--progress": settled / STAGES.length } as CSSProperties}>
      <span className="trail__spine" aria-hidden="true"><span className="trail__fill" /></span>
      <ol className="grid gap-10">
        {STAGES.map((stage, index) => {
          const state = states[index];
          const result = byNode.get(stage.node);
          const time = state === "done" ? formatTime(result?.timestamp) : null;
          return (
            <li key={stage.node} className="stage" data-state={state}>
              <span className="stage__marker" aria-hidden="true">
                {state === "done" && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                {state === "error" && <X className="h-3.5 w-3.5" strokeWidth={3} />}
                {state === "running" && <span className="stage__spin keep-motion" />}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {collapsible && result ? (
                  <h3 className="text-base">
                    <button
                      type="button"
                      className="stage__toggle"
                      aria-expanded={!collapsed.has(stage.node)}
                      aria-controls={`stage-${stage.node}`}
                      onClick={() => toggle(stage.node)}
                    >
                      <span className="stage__title">{stage.title}</span>
                      <ChevronDown className="stage__chevron h-4 w-4" aria-hidden="true" />
                    </button>
                  </h3>
                ) : (
                  <h3 className="stage__title text-base">{stage.title}</h3>
                )}
                <code className="code-text text-xs text-muted-foreground">{stage.node}</code>
                {!preview && (
                  <span className="ml-auto text-sm text-muted-foreground">
                    {time ? <time className="measured text-cool" dateTime={result?.timestamp}>{time}</time> : STATE_LABEL[state]}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{stage.note}</p>
              {renderDetail && result && (
                <div id={`stage-${stage.node}`} className="land mt-5" hidden={collapsible && collapsed.has(stage.node)}>
                  {renderDetail(result)}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
    </div>
  );
};
