import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { StreamingResults } from "@/components/StreamingResults";
import { ContractVisualization } from "@/components/ContractVisualization";
import { projectService } from "@/services/project";
import { toast } from "sonner";

interface AnalysisData {
  status: "pending" | "analyzing" | "complete" | "error";
  projectId?: string;
  projectName: string;
  fileName: string;
  sessionId?: string;
  results?: any;
  error?: string;
}

const Analysis = () => {
  const navigate = useNavigate();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [streamingResults, setStreamingResults] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleBack = () => {
    const storedData = sessionStorage.getItem("contractAnalysis");
    if (storedData) {
      const data = JSON.parse(storedData);
      if (data.isExistingProject && data.projectId) {
        navigate(`/projects/${data.projectId}`);
        return;
      }
    }
    navigate("/");
  };

  useEffect(() => {
    const storedData = sessionStorage.getItem("contractAnalysis");
    const fileContent = sessionStorage.getItem("contractFile");
    
    if (!storedData || !fileContent) {
      navigate("/");
      return;
    }

    const data = JSON.parse(storedData);
    
    // Check if we have project information from the new flow
    if (!data.projectId) {
      toast.error("Project information missing. Please start from the beginning.");
      navigate("/");
      return;
    }

    setAnalysisData({
      status: "analyzing",
      projectId: data.projectId,
      projectName: data.projectName,
      fileName: data.fileName,
    });

    startAnalysis(fileContent, data.projectId, data.fileName);
  }, [navigate]);

  const startAnalysis = async (fileContent: string, projectId: string, fileName: string) => {
    setIsStreaming(true);
    
    try {
      // Create a File object from the content
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const file = new File([blob], fileName, { type: 'text/plain' });

      // Use project service to start analysis with project association
      const { sessionId, stream } = await projectService.analyzeWithProject(file, projectId);
      
      // Update analysis data with session ID
      setAnalysisData(prev => prev ? { ...prev, sessionId } : null);

      // Process the stream
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setIsStreaming(false);
          setAnalysisData(prev => prev ? { ...prev, status: "complete" } : null);
          toast.success("Analysis completed successfully!");
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
              
              // Check for errors in the stream
              if (parsed.node === "error") {
                throw new Error(parsed.output?.error || "Analysis failed");
              }
            } catch (parseError) {
              console.error("Failed to parse line:", line, parseError);
              if (parseError instanceof Error && parseError.message.includes("Analysis failed")) {
                throw parseError;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setIsStreaming(false);
      const errorMessage = error instanceof Error ? error.message : "Analysis failed";
      
      setAnalysisData(prev => prev ? {
        ...prev,
        status: "error",
        error: errorMessage
      } : null);
      
      toast.error(`Analysis failed: ${errorMessage}`);
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {(() => {
              const storedData = sessionStorage.getItem("contractAnalysis");
              if (storedData) {
                const data = JSON.parse(storedData);
                if (data.isExistingProject) return "Project";
              }
              return "Upload";
            })()}
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
