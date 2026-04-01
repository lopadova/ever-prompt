import { useState } from 'react';
import { useNavigate } from 'react-router';
import { FolderKanban, Tag, BarChart3, Layers, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ProjectTree } from '@/components/taxonomy/project-tree';
import { CategoryTree } from '@/components/taxonomy/category-tree';
import { TagCloud } from '@/components/taxonomy/tag-cloud';
import { useSearchFacets } from '@/hooks/use-search';
import { useSearchStore } from '@/stores/search.store';
import { useCreateProject, useCreateCategory } from '@/hooks/use-taxonomy';

export function SidebarRight() {
  const navigate = useNavigate();
  const { data: facets } = useSearchFacets();
  const { setFilters, resetFilters } = useSearchStore();

  const totalFiltered = facets?.quality_bands?.reduce((s, b) => s + b.count, 0) ?? 0;
  const topTag = facets?.tags?.[0] ?? null;

  // Filter state for tags and categories
  const [tagFilter, setTagFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // P10: Create project dialog state
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectColor, setProjectColor] = useState('#6366f1');
  const [projectDesc, setProjectDesc] = useState('');
  const createProject = useCreateProject();

  // Create category dialog state
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('');
  const createCategory = useCreateCategory();

  function handleCreateCategory() {
    if (!categoryName.trim()) return;
    createCategory.mutate(
      {
        name: categoryName.trim(),
        color: categoryColor.trim() || undefined,
      },
      {
        onSuccess: () => {
          setCreateCategoryOpen(false);
          setCategoryName('');
          setCategoryColor('');
        },
      },
    );
  }

  function handleCreateProject() {
    if (!projectName.trim()) return;
    createProject.mutate(
      {
        name: projectName.trim(),
        color: projectColor,
        description: projectDesc.trim() || undefined,
      },
      {
        onSuccess: () => {
          setCreateProjectOpen(false);
          setProjectName('');
          setProjectColor('#6366f1');
          setProjectDesc('');
        },
      },
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-3">
        {/* Browse: Projects */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 px-2.5">
            <FolderKanban className="h-3.5 w-3.5 text-zinc-500" />
            <p className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Projects
            </p>
            {/* P10: Create project button */}
            <button
              onClick={() => setCreateProjectOpen(true)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Create project"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <ProjectTree />
        </div>

        <Separator className="my-3" />

        {/* Browse: Categories */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 px-2.5">
            <Layers className="h-3.5 w-3.5 text-zinc-500" />
            <p className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Categories
            </p>
            <button
              onClick={() => setCreateCategoryOpen(true)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Create category"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="px-2.5 mb-1.5">
            <input
              type="text"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="Filter categories..."
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
            />
          </div>
          <CategoryTree filter={categoryFilter} />
        </div>

        <Separator className="my-3" />

        {/* Browse: Tags */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 px-2.5">
            <Tag className="h-3.5 w-3.5 text-zinc-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Tags
            </p>
          </div>
          <div className="px-2.5 mb-1.5">
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Filter tags..."
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
            />
          </div>
          <TagCloud filter={tagFilter} />
        </div>

        <Separator className="my-3" />

        {/* Quick Stats */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 px-2.5">
            <BarChart3 className="h-3.5 w-3.5 text-zinc-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Quick Stats
            </p>
          </div>
          <div className="space-y-1.5 px-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Filtered</span>
              <span className="text-zinc-300 tabular-nums">{totalFiltered}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Top Tag</span>
              {/* P1: Make top tag clickable */}
              {topTag ? (
                <button
                  onClick={() => {
                    resetFilters();
                    setFilters({ tag_ids: [topTag.id] });
                    navigate('/prompts');
                  }}
                  className="text-zinc-300 truncate ml-2 hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  {topTag.name}
                </button>
              ) : (
                <span className="text-zinc-300 truncate ml-2">--</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* P10: Create project dialog */}
      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your prompts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Name</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={projectColor}
                  onChange={(e) => setProjectColor(e.target.value)}
                  className="h-8 w-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                />
                <Input
                  value={projectColor}
                  onChange={(e) => setProjectColor(e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Description (optional)</label>
              <textarea
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Project description..."
                rows={3}
                className="flex w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateProjectOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!projectName.trim() || createProject.isPending}
            >
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create category dialog */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize your prompts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Name</label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Category name"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Color (optional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={categoryColor || '#6366f1'}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="h-8 w-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                />
                <Input
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateCategoryOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!categoryName.trim() || createCategory.isPending}
            >
              {createCategory.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
