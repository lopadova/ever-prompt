import { useState } from 'react';
import { useNavigate } from 'react-router';
import { FolderOpen, Trash2 } from 'lucide-react';
import { useProjects } from '@/hooks/use-taxonomy';
import { useSearchStore } from '@/stores/search.store';
import { useQueryClient } from '@tanstack/react-query';
import { taxonomyKeys } from '@/hooks/use-taxonomy';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ProjectTree() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: projects } = useProjects();
  const { filters, setFilters, resetFilters } = useSearchStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteProject = async (projectId: string) => {
    try {
      await api.delete(`/projects/${projectId}`);
      queryClient.invalidateQueries({ queryKey: taxonomyKeys.projects() });
      toast.success('Project deleted');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      if (message.includes('prompts')) {
        toast.error('Remove associated prompts first');
      } else {
        toast.error(message);
      }
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (!projects || projects.length === 0) {
    return <p className="px-2.5 text-xs text-zinc-600">No projects yet</p>;
  }

  return (
    <div className="space-y-0.5">
      {projects.map((project) => {
        const active = filters.project_id === project.id;
        return (
          <div key={project.id} className="group relative flex items-center">
            <button
              onClick={() => {
                resetFilters();
                setFilters({ project_id: project.id });
                navigate('/prompts');
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150',
                active
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
              )}
            >
              <div
                className="h-2.5 w-2.5 rounded shrink-0"
                style={{ backgroundColor: project.color ?? '#6366f1' }}
              />
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="truncate">{project.name}</span>
              <span className="ml-auto text-[10px] tabular-nums text-zinc-600">
                {project.prompt_count}
              </span>
            </button>
            {confirmDeleteId === project.id ? (
              <div className="absolute right-1 flex items-center gap-1 bg-zinc-900 rounded px-1 py-0.5 z-10">
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="text-[10px] text-red-400 hover:text-red-300 px-1"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteId(project.id);
                }}
                className="absolute right-1 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5"
                title="Delete project"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
