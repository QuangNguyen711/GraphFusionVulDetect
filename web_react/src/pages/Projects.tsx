import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import Header from "@/components/Header";
import { TruncatedText } from "@/components/TruncatedText";
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity,
  Folder,
  Calendar,
  BarChart3,
  Trash2,
  MoreVertical
} from "lucide-react";
import { projectService, ProjectResponse } from "@/services/project";
import { toast } from "sonner";

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectList = await projectService.listProjects();
      setProjects(projectList);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    try {
      setDeletingProjectId(projectId);
      await projectService.deleteProject(projectId);
      
      // Remove project from state
      setProjects(prev => prev.filter(project => project.id !== projectId));
      
      toast.success(`Project "${projectName}" deleted successfully`);
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    } finally {
      setDeletingProjectId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "analyzing":
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
      case "analyzing":
        return "bg-primary/10 text-primary border-primary/20";
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const handleCreateNew = () => {
    navigate("/");
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 animate-spin" />
              <span className="text-lg">Loading projects...</span>
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
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage your smart contract analysis projects
            </p>
          </div>
          
          <Button
            onClick={handleCreateNew}
            className="gap-2 gradient-primary shadow-glow"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Folder className="h-16 w-16 text-muted-foreground/50" />
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No projects yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first smart contract analysis project
              </p>
              <Button
                onClick={handleCreateNew}
                className="gap-2 gradient-primary"
              >
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="glass p-6 hover:shadow-glow transition-all group relative"
              >
                <div className="space-y-4">
                  {/* Project Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <TruncatedText 
                        text={project.name}
                        maxLines={2}
                        className="font-semibold text-foreground leading-tight"
                      />
                      {project.description && (
                        <div className="mt-1">
                          <TruncatedText 
                            text={project.description}
                            maxLines={2}
                            className="text-sm text-muted-foreground"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(project.status)}`}
                      >
                        <div className="flex items-center gap-1">
                          {getStatusIcon(project.status)}
                          <span className="capitalize text-xs whitespace-nowrap">
                            {project.status}
                          </span>
                        </div>
                      </Badge>
                      
                      {/* Delete Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the project "{project.name}"? 
                              This action cannot be undone and all project data including files and analysis results will be permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProject(project.id, project.name)}
                              disabled={deletingProjectId === project.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deletingProjectId === project.id ? (
                                <div className="flex items-center gap-2">
                                  <Activity className="h-4 w-4 animate-spin" />
                                  Deleting...
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </div>
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Project Stats */}
                  <div 
                    className="grid grid-cols-2 gap-4 py-3 border-y border-border/50 cursor-pointer"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {project.files_count}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Files
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {project.analysis_count}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Analyses
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Footer */}
                  <div 
                    className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>Created {formatDate(project.created_at)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
