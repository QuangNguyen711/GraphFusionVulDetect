import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { StreamingResults } from "@/components/StreamingResults";
import { ContractVisualization } from "@/components/ContractVisualization";

interface AnalysisData {
  status: "pending" | "analyzing" | "complete" | "error";
  projectName: string;
  fileName: string;
  results?: any;
  error?: string;
}

const Analysis = () => {
  const navigate = useNavigate();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [streamingResults, setStreamingResults] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const storedData = sessionStorage.getItem("contractAnalysis");
    if (!storedData) {
      navigate("/");
      return;
    }

    const data = JSON.parse(storedData);
    setAnalysisData({
      status: "analyzing",
      projectName: data.projectName,
      fileName: data.fileName,
    });

    startAnalysis(data.file, data.projectName);
  }, [navigate]);

  const startAnalysis = async (fileContent: string, projectName: string) => {
    setIsStreaming(true);
    
    try {
      const response = await fetch("/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: fileContent,
          projectName: projectName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setIsStreaming(false);
          setAnalysisData(prev => prev ? { ...prev, status: "complete" } : null);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              setStreamingResults(prev => [...prev, parsed]);
            } catch (e) {
              console.error("Failed to parse line:", line, e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setIsStreaming(false);
      setAnalysisData(prev => prev ? {
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Analysis failed"
      } : null);
    }
  };

  const getStatusIcon = () => {
    if (!analysisData) return null;
    
    switch (analysisData.status) {
      case "analyzing":
        return <Activity className="h-6 w-6 text-primary animate-pulse" />;
      case "complete":
        return <CheckCircle className="h-6 w-6 text-success" />;
      case "error":
        return <XCircle className="h-6 w-6 text-destructive" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-warning" />;
    }
  };

  if (!analysisData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Upload
          </Button>
          
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {analysisData.projectName}
              </h1>
              <p className="text-sm text-muted-foreground">{analysisData.fileName}</p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <Card className="glass p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Analysis Status
              </h2>
              <p className="text-muted-foreground capitalize">
                {analysisData.status}
              </p>
            </div>
            {isStreaming && (
              <div className="flex gap-2">
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>
        </Card>

        {/* Error Display */}
        {analysisData.status === "error" && analysisData.error && (
          <Card className="border-destructive bg-destructive/10 p-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive mb-1">Analysis Error</h3>
                <p className="text-sm text-destructive/90">{analysisData.error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Streaming Results */}
        <StreamingResults results={streamingResults} isStreaming={isStreaming} />

        {/* Visualization */}
        {streamingResults.length > 0 && (
          <ContractVisualization data={streamingResults} />
        )}
      </div>
    </div>
  );
};

export default Analysis;
