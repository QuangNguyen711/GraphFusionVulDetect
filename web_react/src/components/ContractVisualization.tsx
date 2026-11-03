import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { PointScan, type ScanFn, type ScanPhase } from "@/components/scan/PointScan";
import { useT } from "@/i18n";

type FunctionPrediction = { function_name: string; prediction: number; confidence: string | number; function_code?: string };

interface ContractVisualizationProps {
  data: any[];
  isStreaming?: boolean;
}

interface VulnerabilityStats {
  totalFunctions: number;
  vulnerableFunctions: number;
  safeFunctions: number;
  sourceVulnerable: boolean;
  sourceConfidence: number;
}

export const ContractVisualization = ({ data, isStreaming = false }: ContractVisualizationProps) => {
  const t = useT();
  const funcOutput = data.find((item) => item.node === "detect_vulnerability_func")?.output;
  const srcOutput = data.find((item) => item.node === "detect_vulnerability_src")?.output;

  const scanFunctions = useMemo<ScanFn[]>(
    () => ((funcOutput?.func_vulnerability_predictions || []) as FunctionPrediction[]).map((func) => ({
      name: func.function_name,
      vulnerable: func.prediction === 1,
      confidence: String(func.confidence),
      size: func.function_code?.length || 100,
    })),
    [funcOutput],
  );
  const scanEdges = useMemo<[number, number][]>(() => funcOutput?.fcg_edges || [], [funcOutput]);
  const phase: ScanPhase = funcOutput || (srcOutput && !isStreaming) ? "done" : isStreaming ? "scanning" : "idle";
  const verdict = srcOutput ? (srcOutput.predicted_class === "Vulnerable" ? "vulnerable" : "safe") : null;

  const getVulnerabilityStats = (): VulnerabilityStats => {
    const stats: VulnerabilityStats = {
      totalFunctions: 0,
      vulnerableFunctions: 0,
      safeFunctions: 0,
      sourceVulnerable: false,
      sourceConfidence: 0,
    };

    data.forEach((item) => {
      if (item.node === "detect_vulnerability_src" && item.output) {
        stats.sourceVulnerable = item.output.predicted_class === "Vulnerable";
        stats.sourceConfidence = item.output.confidence_score * 100;
      }

      if (item.node === "detect_vulnerability_func" && item.output?.func_vulnerability_predictions) {
        const predictions = item.output.func_vulnerability_predictions;
        stats.totalFunctions = predictions.length;
        stats.vulnerableFunctions = predictions.filter((func: any) => func.prediction === 1).length;
        stats.safeFunctions = predictions.filter((func: any) => func.prediction === 0).length;
      }
    });

    return stats;
  };

  const stats = getVulnerabilityStats();

  const getVulnerabilityLevel = () => {
    if (!stats.sourceVulnerable) return { level: t("Safe"), variant: "ok" as const };
    if (stats.sourceConfidence > 80) return { level: t("High Risk"), variant: "destructive" as const };
    if (stats.sourceConfidence > 60) return { level: t("Medium Risk"), variant: "outline" as const };
    return { level: t("Low Risk"), variant: "secondary" as const };
  };

  const vulnerabilityLevel = getVulnerabilityLevel();

  if (data.length === 0 && !isStreaming) return null;

  const hasSource = data.some((item) => item.node === "detect_vulnerability_src" && item.output);
  const vulnerableShare = stats.totalFunctions > 0 ? (stats.vulnerableFunctions / stats.totalFunctions) * 100 : 0;

  const vulnerableCount = scanFunctions.filter((f) => f.vulnerable).length;
  const scanCaption = phase === "scanning"
    ? t("Scanning the contract")
    : scanFunctions.length
    ? t("{n} functions, {k} flagged", { n: scanFunctions.length, k: vulnerableCount })
    : verdict === "safe"
    ? t("Contract not flagged, function check skipped")
    : t("Contract scan");

  return (
    <section className="panel grid overflow-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-labelledby="risk-head">
      <div className="border-b border-rule p-6 lg:border-b-0 lg:border-r lg:p-8">
        <h2 id="risk-head" className="text-lg">{t("Contract Risk Assessment")}</h2>
        {hasSource ? (
          <>
            <div className="ticks land mt-6 inline-block px-5 py-4">
              <p className="reading">
                {stats.sourceConfidence.toFixed(1)}<span className="unit">&thinsp;%</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{t("Source Analysis Confidence")}</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("Overall Risk Level")}</span>
              <Badge variant={vulnerabilityLevel.variant}>{vulnerabilityLevel.level}</Badge>
            </div>
            <p className="mt-5 flex max-w-[52ch] items-start gap-2 text-sm text-ink-2">
              {stats.sourceVulnerable ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-bad" aria-hidden="true" />
              ) : (
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-ok" aria-hidden="true" />
              )}
              <span>
                {stats.sourceVulnerable ? (
                  <>
                    <strong className="font-medium text-ink">{t("Vulnerability Detected:")}</strong>{" "}
                    {t("The contract analysis indicates potential security issues with {p}% confidence.", { p: stats.sourceConfidence.toFixed(1) })}
                    {stats.vulnerableFunctions > 0 && (
                      <> {t("{k} out of {n} functions flagged as vulnerable.", { k: stats.vulnerableFunctions, n: stats.totalFunctions })}</>
                    )}
                  </>
                ) : (
                  <>
                    <strong className="font-medium text-ink">{t("No Major Issues:")}</strong>{" "}
                    {t("The contract appears to be secure based on the analysis with {p}% confidence.", { p: stats.sourceConfidence.toFixed(1) })}
                  </>
                )}
              </span>
            </p>
          </>
        ) : (
          <p className="mt-6 flex items-center gap-3 text-sm text-muted-foreground" role="status">
            {isStreaming && <span className="stage__spin keep-motion" aria-hidden="true" />}
            {t("The contract-level check has not reported yet.")}
          </p>
        )}

        <div className="mt-8 border-t border-rule pt-6">
          <h3 className="text-base">{t("Function Analysis Distribution")}</h3>
          {stats.totalFunctions > 0 ? (
            <>
              <dl className="mt-4 grid grid-cols-3">
                {[
                  { label: t("Total Functions"), value: stats.totalFunctions, tone: "text-ink" },
                  { label: t("Vulnerable Functions"), value: stats.vulnerableFunctions, tone: "text-bad" },
                  { label: t("Safe Functions"), value: stats.safeFunctions, tone: "text-ok" },
                ].map((stat, i) => (
                  <div key={stat.label} className={i === 0 ? "pr-3" : "border-l border-rule px-3"}>
                    <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                    <dd className={`measured mt-1 text-2xl font-normal ${stat.tone}`}>{stat.value}</dd>
                  </div>
                ))}
              </dl>
              <div
                className="grow-x mt-6 flex h-2 overflow-hidden rounded-full bg-ok"
                role="img"
                aria-label={t("{k} of {n} functions vulnerable", { k: stats.vulnerableFunctions, n: stats.totalFunctions })}
              >
                <span className="h-full bg-bad" style={{ flexBasis: `${vulnerableShare}%` }} />
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><span className="h-2 w-3 rounded-sm bg-bad" aria-hidden="true" />{t("Vulnerable Functions")}</li>
                <li className="flex items-center gap-2"><span className="h-2 w-3 rounded-sm bg-ok" aria-hidden="true" />{t("Safe Functions")}</li>
              </ul>
            </>
          ) : (
            <p className="mt-3 max-w-[52ch] text-sm text-muted-foreground">
              {isStreaming ? t("Function scores appear here once the contract is flagged and scored.") : t("No function-level results. That check runs only when the contract itself is flagged.")}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 lg:p-6">
        <PointScan
          functions={scanFunctions}
          edges={scanEdges}
          phase={phase}
          verdict={verdict}
          caption={scanCaption}
          label={t("Point scan of the contract: {c}", { c: scanCaption })}
        />
      </div>
    </section>
  );
};
