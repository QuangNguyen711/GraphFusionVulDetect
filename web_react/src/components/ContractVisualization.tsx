import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface ContractVisualizationProps {
  data: any[];
}

interface VulnerabilityStats {
  totalFunctions: number;
  vulnerableFunctions: number;
  safeFunctions: number;
  sourceVulnerable: boolean;
  sourceConfidence: number;
}

export const ContractVisualization = ({ data }: ContractVisualizationProps) => {
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
    if (!stats.sourceVulnerable) return { level: "Safe", variant: "ok" as const };
    if (stats.sourceConfidence > 80) return { level: "High Risk", variant: "destructive" as const };
    if (stats.sourceConfidence > 60) return { level: "Medium Risk", variant: "outline" as const };
    return { level: "Low Risk", variant: "secondary" as const };
  };

  const vulnerabilityLevel = getVulnerabilityLevel();

  if (data.length === 0) return null;

  const hasSource = data.some((item) => item.node === "detect_vulnerability_src" && item.output);
  const vulnerableShare = stats.totalFunctions > 0 ? (stats.vulnerableFunctions / stats.totalFunctions) * 100 : 0;

  return (
    <section className="panel grid overflow-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-labelledby="risk-head">
      <div className="border-b border-rule p-6 lg:border-b-0 lg:border-r lg:p-8">
        <h2 id="risk-head" className="text-lg">Contract Risk Assessment</h2>
        {hasSource ? (
          <>
            <div className="ticks mt-6 inline-block px-5 py-4">
              <p className="reading">
                {stats.sourceConfidence.toFixed(1)}<span className="unit">&thinsp;%</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Source Analysis Confidence</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Overall Risk Level</span>
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
                    <strong className="font-medium text-ink">Vulnerability Detected:</strong> The contract analysis indicates potential security
                    issues with {stats.sourceConfidence.toFixed(1)}% confidence.
                    {stats.vulnerableFunctions > 0 && (
                      <> {stats.vulnerableFunctions} out of {stats.totalFunctions} functions flagged as vulnerable.</>
                    )}
                  </>
                ) : (
                  <>
                    <strong className="font-medium text-ink">No Major Issues:</strong> The contract appears to be secure based on the analysis
                    with {stats.sourceConfidence.toFixed(1)}% confidence.
                  </>
                )}
              </span>
            </p>
          </>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">The contract-level check has not reported yet.</p>
        )}
      </div>

      <div className="p-6 lg:p-8">
        <h3 className="text-lg">Function Analysis Distribution</h3>
        {stats.totalFunctions > 0 ? (
          <>
            <dl className="mt-6 grid grid-cols-3">
              {[
                { label: "Total Functions", value: stats.totalFunctions, tone: "text-ink" },
                { label: "Vulnerable Functions", value: stats.vulnerableFunctions, tone: "text-bad" },
                { label: "Safe Functions", value: stats.safeFunctions, tone: "text-ok" },
              ].map((stat, i) => (
                <div key={stat.label} className={i === 0 ? "pr-4" : "border-l border-rule px-4"}>
                  <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                  <dd className={`measured mt-1 text-3xl font-normal ${stat.tone}`}>{stat.value}</dd>
                </div>
              ))}
            </dl>
            <div
              className="grow-x mt-8 flex h-2 overflow-hidden rounded-full bg-ok"
              role="img"
              aria-label={`${stats.vulnerableFunctions} of ${stats.totalFunctions} functions vulnerable`}
            >
              <span className="h-full bg-bad" style={{ flexBasis: `${vulnerableShare}%` }} />
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><span className="h-2 w-3 rounded-sm bg-bad" aria-hidden="true" />Vulnerable Functions</li>
              <li className="flex items-center gap-2"><span className="h-2 w-3 rounded-sm bg-ok" aria-hidden="true" />Safe Functions</li>
            </ul>
          </>
        ) : (
          <p className="mt-6 max-w-[52ch] text-sm text-muted-foreground">
            No function-level results. That check runs only when the contract itself is flagged.
          </p>
        )}
      </div>
    </section>
  );
};
