import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  // Extract vulnerability statistics from the streaming data
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
    if (!stats.sourceVulnerable) return { level: "Safe", color: "default" };
    if (stats.sourceConfidence > 80) return { level: "High Risk", color: "destructive" };
    if (stats.sourceConfidence > 60) return { level: "Medium Risk", color: "warning" };
    return { level: "Low Risk", color: "secondary" };
  };

  const vulnerabilityLevel = getVulnerabilityLevel();

  if (data.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">
              {stats.totalFunctions}
            </div>
            <div className="text-sm text-muted-foreground">Total Functions</div>
          </div>
        </Card>

        <Card className="glass p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-destructive mb-2">
              {stats.vulnerableFunctions}
            </div>
            <div className="text-sm text-muted-foreground">Vulnerable Functions</div>
          </div>
        </Card>

        <Card className="glass p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-success mb-2">
              {stats.safeFunctions}
            </div>
            <div className="text-sm text-muted-foreground">Safe Functions</div>
          </div>
        </Card>
      </div>

      {/* Overall Risk Assessment */}
      <Card className="glass p-6">
        <h3 className="text-xl font-bold text-foreground mb-4">Contract Risk Assessment</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium">Overall Risk Level:</span>
            <Badge variant={vulnerabilityLevel.color as any} className="text-sm">
              {vulnerabilityLevel.level}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Source Analysis Confidence: {stats.sourceConfidence.toFixed(1)}%
          </div>
        </div>

        {/* Risk Summary */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-foreground">
            {stats.sourceVulnerable ? (
              <>
                ⚠️ <strong>Vulnerability Detected:</strong> The contract analysis indicates potential security 
                issues with {stats.sourceConfidence.toFixed(1)}% confidence. 
                {stats.vulnerableFunctions > 0 && (
                  <> {stats.vulnerableFunctions} out of {stats.totalFunctions} functions flagged as vulnerable.</>
                )}
              </>
            ) : (
              <>
                ✅ <strong>No Major Issues:</strong> The contract appears to be secure based on the analysis 
                with {stats.sourceConfidence.toFixed(1)}% confidence.
              </>
            )}
          </p>
        </div>
      </Card>

      {/* Function Distribution */}
      {stats.totalFunctions > 0 && (
        <Card className="glass p-6">
          <h3 className="text-xl font-bold text-foreground mb-4">Function Analysis Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Vulnerable Functions</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive transition-all duration-1000"
                    style={{ width: `${(stats.vulnerableFunctions / stats.totalFunctions) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12">
                  {stats.vulnerableFunctions}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Safe Functions</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success transition-all duration-1000"
                    style={{ width: `${(stats.safeFunctions / stats.totalFunctions) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12">
                  {stats.safeFunctions}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
