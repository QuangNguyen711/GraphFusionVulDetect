import { Badge } from "@/components/ui/badge";
import { AlertTriangle, XCircle } from "lucide-react";
import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from "@/components/ui/accordion";
import { FunctionGraphVisualization } from "./FunctionGraphVisualization";
import { PipelineTrail, StageResult } from "./Pipeline";
import { useT } from "@/i18n";

interface StreamingResultsProps {
  results: any[];
  isStreaming: boolean;
}

const renderDetail = (result: StageResult, t: ReturnType<typeof useT>) => {
  const output = result.output;
  if (!output) return null;

  if (result.node === "convert_to_fcg" && output.fcg_file_path) {
    return (
      <dl className="well flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
        <dt className="text-muted-foreground">{t("FCG File Path")}</dt>
        <dd className="code-text min-w-0 break-all text-xs text-ink-2">{output.fcg_file_path}</dd>
      </dl>
    );
  }

  if (result.node === "detect_vulnerability_src") {
    const vulnerable = output.predicted_class === "Vulnerable";
    return (
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">{t("Prediction")}</dt>
          <dd><Badge variant={vulnerable ? "destructive" : "ok"}>{vulnerable ? t("Vulnerable") : t("Not vulnerable")}</Badge></dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">{t("Confidence")}</dt>
          <dd className="measured text-cool">{(output.confidence_score * 100).toFixed(2)}%</dd>
        </div>
      </dl>
    );
  }

  if (result.node === "detect_vulnerability_func") {
    return (
      <div className="space-y-6">
        {output.fcg_edges && output.func_vulnerability_predictions && (
          <FunctionGraphVisualization
            fcgEdges={output.fcg_edges}
            funcVulnerabilityPredictions={output.func_vulnerability_predictions}
          />
        )}

        {output.func_vulnerability_predictions && (
          <div>
            <h4 className="mb-2 text-sm text-muted-foreground">{t("Function Vulnerability Predictions")}</h4>
            <Accordion type="single" collapsible className="border-t border-rule">
              {output.func_vulnerability_predictions.map((func: any, idx: number) => (
                <AccordionItem key={idx} value={`function-${idx}`} className="border-rule">
                  <AccordionTrigger className="min-w-0 gap-3 px-2 py-3 hover:bg-paper-2 hover:no-underline">
                    <span className="code-text min-w-0 flex-1 truncate text-left text-sm text-ink">{func.function_name}</span>
                    <Badge variant={func.prediction === 1 ? "destructive" : "ok"}>
                      {func.prediction === 1 ? t("Vulnerable") : t("Safe")}
                    </Badge>
                    <span className="measured w-12 text-right text-sm text-cool">{func.confidence}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2">
                    <pre className="code-text well overflow-x-auto p-4 text-xs leading-relaxed text-ink-2">{func.function_code}</pre>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {output.fcg_edges && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-ink">{t("Function Call Graph Edges")}</summary>
            <p className="code-text well mt-2 break-all p-3 text-xs text-ink-2">{JSON.stringify(output.fcg_edges)}</p>
          </details>
        )}
      </div>
    );
  }

  if (result.node === "explain_vulnerability_func" && output.explanations) {
    return (
      <ul className="space-y-3">
        {output.explanations.map((explanation: any, idx: number) => (
          <li key={idx} className="rounded-md bg-bad-soft p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-bad" aria-hidden="true" />
              <div className="min-w-0">
                <h4 className="code-text break-words text-sm text-ink">{explanation.function_name}</h4>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{explanation.explanation}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return null;
};

export const StreamingResults = ({ results, isStreaming }: StreamingResultsProps) => {
  const t = useT();
  if (results.length === 0 && !isStreaming) {
    return null;
  }

  const errors = results.filter((r) => r.node === "error" && r.output?.error);

  return (
    <section className="space-y-6" aria-labelledby="analysis-results-head">
      <div className="flex items-center justify-between gap-4">
        <h2 id="analysis-results-head" className="text-xl">{t("Analysis Results")}</h2>
        {isStreaming && (
          <Badge variant="signal" role="status">
            <span className="stage__spin keep-motion" aria-hidden="true" />
            {t("Analyzing…")}
          </Badge>
        )}
      </div>

      <PipelineTrail results={results} isStreaming={isStreaming} renderDetail={(r) => renderDetail(r, t)} />

      {errors.map((error, idx) => (
        <div key={idx} role="alert" className="flex items-start gap-3 rounded-md bg-bad-soft p-4">
          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-bad" aria-hidden="true" />
          <div>
            <h3 className="text-base text-bad">{t("Analysis Error")}</h3>
            <p className="mt-1 text-sm text-ink-2">{error.output.error}</p>
          </div>
        </div>
      ))}
    </section>
  );
};
