import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { 
  ArrowLeft, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  BarChart3,
  Calendar,
  Play,
  Folder,
  Upload
} from "lucide-react";
import { StreamingResults } from "@/components/StreamingResults";
import { ContractVisualization } from "@/components/ContractVisualization";
import { RefactorChatbot } from "@/components/RefactorChatbot";
import { FileUpload } from "@/components/FileUpload";
import { TruncatedText } from "@/components/TruncatedText";
import { projectService, Project, AnalysisSession } from "@/services/project";
import { toast } from "sonner";

const ProjectAnalysis = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [analysisSessions, setAnalysisSessions] = useState<AnalysisSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AnalysisSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewAnalysis, setShowNewAnalysis] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File; content: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      // Load project details and analysis sessions concurrently
      const [projectData, sessions] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectAnalysisSessions(projectId)
      ]);
      
      setProject(projectData);
      setAnalysisSessions(sessions);
      
      // If there are sessions, select the most recent one
      if (sessions.length > 0) {
        setSelectedSession(sessions[0]);
      }
    } catch (error) {
      console.error("Error loading project data:", error);
      toast.error("Failed to load project data");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Activity className="h-4 w-4 text-primary animate-pulse" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processing":
        return "bg-primary/10 text-primary border-primary/20";
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFileSelect = (file: File, content: string) => {
    setSelectedFile({ file, content });
  };

  const handleStartNewAnalysis = async () => {
    if (!selectedFile || !project) {
      toast.error("Please select a file");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const { sessionId, stream } = await projectService.analyzeWithProject(
        selectedFile.file, 
        project.id
      );

      // Store analysis data for the streaming page
      sessionStorage.setItem(
        "contractAnalysis",
        JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          fileName: selectedFile.file.name,
          sessionId: sessionId,
          isExistingProject: true
        })
      );

      sessionStorage.setItem("contractFile", selectedFile.content);

      toast.success("Analysis started!");
      navigate("/analysis");
    } catch (error) {
      console.error("Error starting analysis:", error);
      toast.error("Failed to start analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSessionClick = (session: AnalysisSession) => {
    setSelectedSession(session);
  };

  const handleBackToProjects = () => {
    navigate("/projects");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 animate-spin" />
              <span className="text-lg">Loading project...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Project not found
              </h2>
              <Button onClick={handleBackToProjects}>
                Back to Projects
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBackToProjects}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowNewAnalysis(!showNewAnalysis)}
              className="gap-2 gradient-primary"
            >
              <Upload className="h-4 w-4" />
              {showNewAnalysis ? "Hide Upload" : "New Analysis"}
            </Button>
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="glass p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <TruncatedText 
                      text={project.name}
                      maxLines={2}
                      className="text-3xl font-bold text-foreground mb-2"
                    />
                    {project.description && (
                      <TruncatedText 
                        text={project.description}
                        maxLines={3}
                        className="text-muted-foreground"
                      />
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(project.status)}
                    >
                      <div className="flex items-center gap-1">
                        {getStatusIcon(project.status)}
                        <span className="capitalize whitespace-nowrap">
                          {project.status}
                        </span>
                      </div>
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        {project.files.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Files
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        {project.analysis_count}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Analyses
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Created
                      </div>
                      <div className="text-sm font-medium">
                        {formatDate(project.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Analysis Sessions Sidebar */}
          <div>
            <Card className="glass p-6">
              <h3 className="font-semibold text-foreground mb-4">
                Analysis History
              </h3>
              
              {analysisSessions.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Folder className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    No analysis sessions yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysisSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSession?.id === session.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleSessionClick(session)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <TruncatedText 
                            text={session.filename}
                            maxLines={2}
                            className="text-sm font-medium leading-tight"
                          />
                        </div>
                        <div className="flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(session.status)}
                          >
                            {getStatusIcon(session.status)}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDate(session.started_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* New Analysis Upload */}
        {showNewAnalysis && (
          <Card className="glass p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Start New Analysis
            </h3>
            <div className="space-y-4">
              <FileUpload onFileSelect={handleFileSelect} />
              {selectedFile && (
                <Button
                  onClick={handleStartNewAnalysis}
                  disabled={isAnalyzing}
                  className="w-full gradient-primary"
                >
                  {isAnalyzing ? (
                    <>
                      <Activity className="mr-2 h-4 w-4 animate-spin" />
                      Starting Analysis...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Analysis
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Analysis Results */}
        {selectedSession && (
          <div className="space-y-6">
            <Card className="glass p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <TruncatedText 
                    text={`Analysis Results: ${selectedSession.filename}`}
                    maxLines={2}
                    className="font-semibold text-foreground leading-tight"
                  />
                </div>
                <div className="flex-shrink-0">
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(selectedSession.status)}
                  >
                    <div className="flex items-center gap-1">
                      {getStatusIcon(selectedSession.status)}
                      <span className="capitalize whitespace-nowrap">
                        {selectedSession.status}
                      </span>
                    </div>
                  </Badge>
                </div>
              </div>
              
              {selectedSession.error_message && (
                <Card className="border-destructive bg-destructive/10 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-destructive mb-1">Analysis Error</h4>
                      <p className="text-sm text-destructive/90">{selectedSession.error_message}</p>
                    </div>
                  </div>
                </Card>
              )}

              {selectedSession.steps && selectedSession.steps.length > 0 && (
                <StreamingResults 
                  results={selectedSession.steps.map(step => ({
                    node: step.step_name,
                    status: step.status,
                    output: step.result_data,
                    timestamp: step.started_at
                  }))} 
                  isStreaming={false} 
                />
              )}
            </Card>

            {/* Visualization for completed analysis */}
            {selectedSession.status === 'completed' && selectedSession.steps && (
              <ContractVisualization 
                data={selectedSession.steps.map(step => ({
                  node: step.step_name,
                  status: step.status,
                  output: step.result_data,
                  timestamp: step.started_at
                }))} 
              />
            )}
          </div>
        )}
      </div>

      {/* Refactor Chatbot */}
      {selectedSession && (
        <RefactorChatbot 
          vulnerableFunctions={
            selectedSession.steps
              ?.flatMap(step => step.result_data?.func_vulnerability_predictions || [])
              .filter((func, index, self) => 
                index === self.findIndex(f => f.function_name === func.function_name)
              ) || []
          } 
        />
      )}
    </div>
  );
};

export default ProjectAnalysis;
