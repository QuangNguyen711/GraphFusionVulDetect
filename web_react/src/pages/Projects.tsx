import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Activity, Trash2 } from "lucide-react";
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

  const getStatusVariant = (status: string) => {
    switch (status) {
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

  const handleCreateNew = () => {
    navigate("/analysis");
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
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

  const deleteDialog = (project: ProjectResponse) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-bad"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Delete project ${project.name}`}
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
            className="border-bad bg-bad text-paper-3 hover:bg-bad/85"
          >
            {deletingProjectId === project.id ? (
              <>
                <Activity className="keep-motion h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="min-h-dvh bg-background">
      <Header />

      <main id="main" className="shell py-12 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl leading-none">Projects</h1>
            <p className="mt-3 text-ink-2">Manage your smart contract analysis projects</p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {loading ? (
          <div className="mt-10 border-t border-rule" role="status" aria-label="Loading projects">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-6 border-b border-rule py-5">
                <span className="h-4 w-1/3 animate-pulse rounded-sm bg-paper-3" />
                <span className="ml-auto h-4 w-20 animate-pulse rounded-sm bg-paper-3" />
                <span className="hidden h-4 w-32 animate-pulse rounded-sm bg-paper-3 md:block" />
              </div>
            ))}
            <span className="sr-only">Loading projects…</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="ticks mt-10 px-8 py-12">
            <h2 className="text-2xl">No projects yet</h2>
            <p className="mt-2 max-w-[48ch] text-ink-2">
              Create your first smart contract analysis project
            </p>
            <Button onClick={handleCreateNew} className="mt-6">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </div>
        ) : (
          <table className="mt-10 w-full border-collapse text-left">
            <caption className="sr-only">Your projects</caption>
            <thead>
              <tr className="border-b border-rule-2 text-sm text-muted-foreground">
                <th scope="col" className="w-[44%] py-3 pr-4 font-normal">Project</th>
                <th scope="col" className="py-3 pr-4 font-normal">Status</th>
                <th scope="col" className="hidden py-3 pr-4 text-right font-normal md:table-cell">Files</th>
                <th scope="col" className="hidden py-3 pr-4 text-right font-normal md:table-cell">Analyses</th>
                <th scope="col" className="hidden py-3 pr-4 font-normal lg:table-cell">Created</th>
                <th scope="col" className="w-10 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="cursor-pointer border-b border-rule align-top transition-colors duration-200 hover:bg-paper-2"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <td className="max-w-[1px] py-4 pr-4">
                    <button
                      type="button"
                      className="block max-w-full rounded-sm text-left"
                      onClick={(e) => { e.stopPropagation(); handleProjectClick(project.id); }}
                    >
                      <TruncatedText text={project.name} maxLines={1} className="text-ink" showTooltip={false} />
                    </button>
                    {project.description && (
                      <TruncatedText text={project.description} maxLines={1} className="mt-1 text-sm text-muted-foreground" showTooltip={false} />
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground lg:hidden">Created {formatDate(project.created_at)}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <Badge variant={getStatusVariant(project.status)}>
                      {project.status === "analyzing" && <span className="stage__spin keep-motion h-2.5 w-2.5" aria-hidden="true" />}
                      <span className="capitalize">{project.status}</span>
                    </Badge>
                  </td>
                  <td className="measured hidden py-4 pr-4 text-right md:table-cell">{project.files_count}</td>
                  <td className="measured hidden py-4 pr-4 text-right md:table-cell">{project.analysis_count}</td>
                  <td className="measured hidden whitespace-nowrap py-4 pr-4 text-sm text-ink-2 lg:table-cell">{formatDate(project.created_at)}</td>
                  <td className="py-3">{deleteDialog(project)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
};

export default Projects;
