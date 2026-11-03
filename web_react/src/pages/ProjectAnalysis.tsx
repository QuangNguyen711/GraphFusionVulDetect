import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { ArrowLeft, Activity, XCircle, Play, Upload } from "lucide-react";
import { StreamingResults } from "@/components/StreamingResults";
import { ContractVisualization } from "@/components/ContractVisualization";
import { RefactorChatbot } from "@/components/RefactorChatbot";
import { FileUpload } from "@/components/FileUpload";
import { TruncatedText } from "@/components/TruncatedText";
import { projectService, Project, AnalysisSession } from "@/services/project";
import { toast } from "sonner";
import { useT } from "@/i18n";

const ProjectAnalysis = () => {
  const navigate = useNavigate();
  const t = useT();
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
      toast.error(t("Failed to load project data"));
      navigate("/project");
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "processing":
      case "analyzing":
        return "signal" as const;
      case "completed":
        return "secondary" as const;
      case "failed":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(t.locale, {
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
      toast.error(t("Choose a .sol file."));
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

      toast.success(t("Analysis started"));
      navigate("/analysis/live");
    } catch (error) {
      console.error("Error starting analysis:", error);
      toast.error(t("Failed to start analysis"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSessionClick = (session: AnalysisSession) => {
    setSelectedSession(session);
  };

  const handleBackToProjects = () => {
    navigate("/project");
  };

  const toResults = (session: AnalysisSession) =>
    (session.steps || []).map(step => ({
      node: step.step_name,
      status: step.status,
      output: step.result_data,
      timestamp: step.started_at
    }));

  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <main id="main" className="shell py-12" role="status">
          <span className="block h-4 w-32 animate-pulse rounded-sm bg-paper-3" />
          <span className="mt-6 block h-10 w-2/3 max-w-xl animate-pulse rounded-sm bg-paper-3" />
          <span className="mt-10 block h-64 animate-pulse rounded-md bg-paper-2" />
          <span className="sr-only">{t("Loading project…")}</span>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <main id="main" className="shell py-16">
          <h1 className="text-3xl">{t("Project not found")}</h1>
          <Button onClick={handleBackToProjects} variant="outline" className="mt-6">
            {t("Back to Projects")}
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header />

      <main id="main" className="shell py-10 lg:py-12">
        <Button variant="link" onClick={handleBackToProjects} className="gap-2 text-sm text-ink-2">
          <ArrowLeft className="h-4 w-4" />
          {t("Back to Projects")}
        </Button>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-6 border-b border-rule pb-8">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="min-w-0 text-4xl leading-none">
                <TruncatedText text={project.name} maxLines={2} />
              </h1>
              <Badge variant={getStatusVariant(project.status)}>
                <span>{t(project.status.charAt(0).toUpperCase() + project.status.slice(1))}</span>
              </Badge>
            </div>
            {project.description && (
              <TruncatedText text={project.description} maxLines={3} className="mt-3 block text-ink-2" />
            )}
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{t("Files")}</dt>
                <dd className="measured mt-1 text-lg text-ink">{project.files.length}</dd>
              </div>
              <div className="border-l border-rule pl-8">
                <dt className="text-muted-foreground">{t("Analyses")}</dt>
                <dd className="measured mt-1 text-lg text-ink">{project.analysis_count}</dd>
              </div>
              <div className="border-l border-rule pl-8">
                <dt className="text-muted-foreground">{t("Created")}</dt>
                <dd className="measured mt-1 text-lg text-ink">{formatDate(project.created_at)}</dd>
              </div>
            </dl>
          </div>

          <Button onClick={() => setShowNewAnalysis(!showNewAnalysis)} aria-expanded={showNewAnalysis}>
            <Upload className="h-4 w-4" />
            {showNewAnalysis ? t("Hide Upload") : t("New Analysis")}
          </Button>
        </div>

        {showNewAnalysis && (
          <section className="land border-b border-rule py-8" aria-labelledby="new-run-head">
            <h2 id="new-run-head" className="text-xl">{t("Start New Analysis")}</h2>
            <div className="mt-5 max-w-2xl space-y-4">
              <FileUpload onFileSelect={handleFileSelect} />
              {selectedFile && (
                <Button onClick={handleStartNewAnalysis} disabled={isAnalyzing} variant="outline" aria-busy={isAnalyzing}>
                  {isAnalyzing ? (
                    <>
                      <Activity className="keep-motion h-4 w-4 animate-spin" />
                      {t("Starting Analysis…")}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      {t("Start Analysis")}
                    </>
                  )}
                </Button>
              )}
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-12">
          <aside aria-labelledby="history-head">
            <h2 id="history-head" className="text-sm text-muted-foreground">{t("Analysis History")}</h2>
            {analysisSessions.length === 0 ? (
              <p className="mt-4 text-sm text-ink-2">
                {t("No analysis sessions yet. Use New Analysis to scan a file.")}
              </p>
            ) : (
              <ol className="mt-4 border-l border-rule-2">
                {analysisSessions.map((session, index) => {
                  const selected = selectedSession?.id === session.id;
                  return (
                    <li key={session.id || `session-${index}`}>
                      <button
                        type="button"
                        aria-current={selected ? "true" : undefined}
                        className={`relative -ml-px block w-full border-l py-3 pl-4 pr-2 text-left transition-colors duration-200 hover:bg-paper-2 ${
                          selected ? "border-signal bg-paper-2" : "border-transparent"
                        }`}
                        onClick={() => handleSessionClick(session)}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <TruncatedText text={session.filename} maxLines={1} className="code-text text-sm text-ink" showTooltip={false} />
                          {session.status !== "completed" && (
                            <Badge variant={getStatusVariant(session.status)}>
                              <span>{t(session.status.charAt(0).toUpperCase() + session.status.slice(1))}</span>
                            </Badge>
                          )}
                        </span>
                        <span className="measured mt-1 block text-xs text-cool">{formatDate(session.started_at)}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>

          <div className="min-w-0 space-y-10">
            {selectedSession ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-sm text-muted-foreground">
                    {t("Analysis Results:")} <span className="code-text text-ink">{selectedSession.filename}</span>
                  </h2>
                  <Badge variant={getStatusVariant(selectedSession.status)}>
                    <span>{t(selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1))}</span>
                  </Badge>
                </div>

                {selectedSession.error_message && (
                  <div role="alert" className="flex items-start gap-3 rounded-md bg-bad-soft p-4">
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-bad" aria-hidden="true" />
                    <div>
                      <h3 className="text-base text-bad">{t("Analysis Error")}</h3>
                      <p className="mt-1 text-sm text-ink-2">{selectedSession.error_message}</p>
                    </div>
                  </div>
                )}

                {selectedSession.status === 'completed' && selectedSession.steps && (
                  <ContractVisualization data={toResults(selectedSession)} />
                )}

                {selectedSession.steps && selectedSession.steps.length > 0 && (
                  <StreamingResults results={toResults(selectedSession)} isStreaming={false} />
                )}
              </>
            ) : (
              <p className="text-ink-2">{t("Pick a session on the left, or start a new analysis.")}</p>
            )}
          </div>
        </div>
      </main>

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
