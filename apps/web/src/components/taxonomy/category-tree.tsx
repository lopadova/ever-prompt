import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Layers, Trash2 } from 'lucide-react';
import { useCategoriesTree, taxonomyKeys } from '@/hooks/use-taxonomy';
import { useSearchStore } from '@/stores/search.store';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Category } from '@everprompt/shared';

interface CategoryTreeProps {
  filter?: string;
}

function matchesFilter(category: Category, filter: string): boolean {
  const lower = filter.toLowerCase();
  if (category.name.toLowerCase().includes(lower)) return true;
  if (category.children) {
    return category.children.some((child) => matchesFilter(child, lower));
  }
  return false;
}

export function CategoryTree({ filter }: CategoryTreeProps) {
  const { data: categories } = useCategoriesTree();

  if (!categories || categories.length === 0) {
    return <p className="px-2.5 text-xs text-zinc-600">No categories yet</p>;
  }

  const filtered = filter
    ? categories.filter((cat) => matchesFilter(cat, filter))
    : categories;

  if (filtered.length === 0) {
    return <p className="px-2.5 text-xs text-zinc-600">No matching categories</p>;
  }

  return (
    <div className="space-y-0.5">
      {filtered.map((cat) => (
        <CategoryNode key={cat.id} category={cat} depth={0} />
      ))}
    </div>
  );
}

function CategoryNode({ category, depth }: { category: Category; depth: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = useSearchStore();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const active = filters.category_id === category.id;

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${category.id}`);
      queryClient.invalidateQueries({ queryKey: taxonomyKeys.categories() });
      queryClient.invalidateQueries({ queryKey: taxonomyKeys.categoriesTree() });
      toast.success('Category deleted');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      if (message.includes('prompts') || category.prompt_count > 0) {
        toast.error('Remove associated prompts first');
      } else {
        toast.error(message);
      }
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <div>
      <div className="group relative flex items-center">
        <button
          onClick={() => {
            if (hasChildren) {
              setExpanded(!expanded);
            }
            resetFilters();
            setFilters({ category_id: category.id });
            navigate('/prompts');
          }}
          className={cn(
            'flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150',
            active
              ? 'bg-indigo-500/10 text-indigo-400'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
          )}
          style={{ paddingLeft: `${10 + depth * 16}px` }}
        >
          {hasChildren ? (
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-transform duration-150',
                expanded && 'rotate-90',
              )}
            />
          ) : (
            <Layers className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
          )}
          <span className="truncate">{category.name}</span>
          <span className="ml-auto text-[10px] tabular-nums text-zinc-600">
            {category.prompt_count}
          </span>
        </button>
        {confirmDelete ? (
          <div className="absolute right-1 flex items-center gap-1 bg-zinc-900 rounded px-1 py-0.5 z-10">
            <button
              onClick={() => handleDelete()}
              className="text-[10px] text-red-400 hover:text-red-300 px-1"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="absolute right-1 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5"
            title="Delete category"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {category.children!.map((child) => (
            <CategoryNode key={child.id} category={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
