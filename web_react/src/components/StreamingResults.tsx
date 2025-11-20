import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, XCircle, FileText, Shield, Search } from "lucide-react";
import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from "@/components/ui/accordion";

interface StreamingResultsProps {
  results: any[];
  isStreaming: boolean;
}

export const StreamingResults = ({ results, isStreaming }: StreamingResultsProps) => {
  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case "convert_to_fcg":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "detect_vulnerability_src":
        return <Shield className="h-5 w-5 text-orange-500" />;
      case "detect_vulnerability_func":
        return <Search className="h-5 w-5 text-purple-500" />;
      case "explain_vulnerability_func":
        return <Info className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getNodeTitle = (nodeType: string) => {
    switch (nodeType) {
      case "convert_to_fcg":
        return "Function Call Graph Generation";
      case "detect_vulnerability_src":
        return "Source Code Vulnerability Detection";
      case "detect_vulnerability_func":
        return "Function-level Vulnerability Detection";
      case "explain_vulnerability_func":
        return "Vulnerability Explanation";
      case "error":
        return "Analysis Error";
      default:
        return "Analysis Step";
    }
  };

  const getVulnerabilityBadgeColor = (predicted_class: string) => {
    return predicted_class === "Vulnerable" ? "destructive" : "default";
  };

  const getPredictionBadgeColor = (prediction: number) => {
    return prediction === 1 ? "destructive" : "default";
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
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1">{getNodeIcon(result.node)}</div>
              
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {getNodeTitle(result.node)}
                    </h3>
                    <Badge variant="outline" className="mb-2">
                      {result.node}
                    </Badge>
                  </div>
                  
                  <Badge variant="default">
                    Step {index + 1}
                  </Badge>
                </div>

                {/* Handle different node types */}
                {result.node === "convert_to_fcg" && result.output?.fcg_file_path && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">FCG File Path: </span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{result.output.fcg_file_path}</code>
                    </p>
                  </div>
                )}

                {result.node === "detect_vulnerability_src" && result.output && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Prediction:</span>
                      <Badge variant={getVulnerabilityBadgeColor(result.output.predicted_class) as any}>
                        {result.output.predicted_class}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Confidence: {(result.output.confidence_score * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}

                {result.node === "detect_vulnerability_func" && result.output && (
                  <div className="space-y-4">
                    {result.output.fcg_edges && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm font-medium mb-2">Function Call Graph Edges:</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {JSON.stringify(result.output.fcg_edges)}
                        </p>
                      </div>
                    )}
                    
                    {result.output.func_vulnerability_predictions && (
                      <div>
                        <p className="text-sm font-medium mb-3">Function Vulnerability Predictions:</p>
                        <Accordion type="single" collapsible className="space-y-2">
                          {result.output.func_vulnerability_predictions.map((func: any, idx: number) => (
                            <AccordionItem key={idx} value={`function-${idx}`} className="border rounded-lg">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                <div className="flex items-center justify-between w-full mr-4">
                                  <span className="text-sm font-medium text-left">
                                    {func.function_name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getPredictionBadgeColor(func.prediction) as any} className="text-xs">
                                      {func.prediction === 1 ? "Vulnerable" : "Safe"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {func.confidence}
                                    </span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="bg-muted/30 rounded-lg p-3">
                                  <p className="text-xs font-medium mb-2">Function Code:</p>
                                  <pre className="text-xs text-foreground whitespace-pre-wrap font-mono overflow-x-auto">
                                    {func.function_code}
                                  </pre>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    )}
                  </div>
                )}

                {result.node === "explain_vulnerability_func" && result.output?.explanations && (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Vulnerability Explanations:</p>
                    {result.output.explanations.map((explanation: any, idx: number) => (
                      <div key={idx} className="border border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-500 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                              {explanation.function_name}
                            </h4>
                            <div className="text-sm text-orange-700 dark:text-orange-300 whitespace-pre-wrap leading-relaxed">
                              {explanation.explanation}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {result.node === "error" && result.output?.error && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-destructive mt-1" />
                      <div>
                        <h4 className="font-semibold text-destructive mb-1">Analysis Error</h4>
                        <p className="text-sm text-destructive/90">{result.output.error}</p>
                      </div>
                    </div>
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
