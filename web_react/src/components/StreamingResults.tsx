import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

interface StreamingResultsProps {
  results: any[];
  isStreaming: boolean;
}

export const StreamingResults = ({ results, isStreaming }: StreamingResultsProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "error":
      case "critical":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "success":
      case "passed":
        return <CheckCircle className="h-5 w-5 text-success" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  if (results.length === 0 && !isStreaming) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Analysis Results</h2>
        {isStreaming && (
          <Badge variant="outline" className="gap-2">
            <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
            Analyzing...
          </Badge>
        )}
      </div>

      <div className="grid gap-4">
        {results.map((result, index) => (
          <Card
            key={index}
            className="glass p-6 transition-smooth hover:shadow-glow animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1">{getIcon(result.type || result.severity)}</div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {result.title || result.name || "Analysis Item"}
                    </h3>
                    {result.category && (
                      <Badge variant="outline" className="mb-2">
                        {result.category}
                      </Badge>
                    )}
                  </div>
                  
                  {result.severity && (
                    <Badge variant={getSeverityColor(result.severity) as any}>
                      {result.severity}
                    </Badge>
                  )}
                </div>

                {result.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {result.description}
                  </p>
                )}

                {result.details && (
                  <div className="bg-muted/50 rounded-lg p-4 mt-3">
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                      {typeof result.details === "string"
                        ? result.details
                        : JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}

                {result.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Line {result.location.line}</span>
                    {result.location.column && (
                      <span>Column {result.location.column}</span>
                    )}
                  </div>
                )}

                {result.recommendation && (
                  <div className="bg-accent/20 border border-accent/30 rounded-lg p-4 mt-3">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">Recommendation: </span>
                      {result.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
