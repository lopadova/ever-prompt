import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { SearchBar } from '@/components/search/search-bar';
import { FilterBar } from '@/components/search/filter-bar';
import { PromptCard } from '@/components/prompt/prompt-card';
import { PromptRow } from '@/components/prompt/prompt-row';
import { EmptyState } from '@/components/shared/empty-state';
import { CardSkeleton, ListRowSkeleton } from '@/components/shared/loading-skeleton';
import { usePromptList } from '@/hooks/use-prompts';
import { useUiStore } from '@/stores/ui.store';
import { useSelectionStore } from '@/stores/selection.store';
import { useSearchStore } from '@/stores/search.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function PromptsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const viewMode = useUiStore((s) => s.viewMode);
  const { data, isLoading } = usePromptList();
  const { selectAll, clear, selectedIds } = useSelectionStore();
  const page = useSearchStore((s) => s.page);
  const setPage = useSearchStore((s) => s.setPage);
  const query = useSearchStore((s) => s.query);
  const filters = useSearchStore((s) => s.filters);
  const sort = useSearchStore((s) => s.sort);

  // P9: Save search state
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  const saveSearch = useMutation({
    mutationFn: (data: { name: string; query_text: string; filters_json: string; sort_json: string }) =>
      api.post('/saved-searches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      toast.success('Search saved');
      setSaveSearchOpen(false);
      setSaveSearchName('');
    },
    onError: (err) => {
      toast.error(`Failed to save search: ${err.message}`);
    },
  });

  const hasActiveSearch = !!(query || Object.keys(filters).length > 0);

  const prompts = data?.prompts ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.has_more ?? false;
  const allSelected =
    prompts.length > 0 && prompts.every((p) => selectedIds.has(p.id));

  function handleSelectAll() {
    if (allSelected) {
      clear();
    } else {
      selectAll(prompts.map((p) => p.id));
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 space-y-3 border-b border-zinc-800 bg-zinc-950/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-zinc-100">Prompts</h1>
            <span className="text-xs tabular-nums text-zinc-500">
              {total} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* P9: Save Search button */}
            {hasActiveSearch && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveSearchOpen(true)}
              >
                <Bookmark className="h-3.5 w-3.5 mr-1" />
                Save Search
              </Button>
            )}
            <Button size="sm" onClick={() => navigate('/prompts/new')}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Prompt
            </Button>
          </div>
        </div>

        <SearchBar />
        <FilterBar />
      </div>

      {/* Select all row */}
      {prompts.length > 0 && (
        <div className="shrink-0 flex items-center gap-2 border-b border-zinc-800/50 px-4 py-1.5">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className="h-3.5 w-3.5"
          />
          <span className="text-[11px] text-zinc-500">
            {allSelected ? 'Deselect all' : 'Select all'}
          </span>
          {selectedIds.size > 0 && (
            <span className="text-[11px] text-indigo-400 tabular-nums">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              {Array.from({ length: 10 }).map((_, i) => (
                <ListRowSkeleton key={i} />
              ))}
            </div>
          )
        ) : prompts.length === 0 ? (
          <EmptyState
            title="No prompts found"
            description="Try adjusting your search query or filters, or create a new prompt to get started."
            action={{
              label: 'Create Prompt',
              onClick: () => navigate('/prompts/new'),
            }}
          />
        ) : viewMode === 'grid' ? (
          <motion.div
            layout
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {prompts.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {prompts.map((prompt) => (
                <PromptRow key={prompt.id} prompt={prompt} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-zinc-500 tabular-nums">
              Page {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
      {/* P9: Save Search dialog */}
      <Dialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save the current search query and filters for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">Name</label>
            <Input
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="My search..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saveSearchName.trim()) {
                  saveSearch.mutate({
                    name: saveSearchName.trim(),
                    query_text: query,
                    filters_json: JSON.stringify(filters),
                    sort_json: JSON.stringify(sort),
                  });
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveSearchOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                saveSearch.mutate({
                  name: saveSearchName.trim(),
                  query_text: query,
                  filters_json: JSON.stringify(filters),
                  sort_json: JSON.stringify(sort),
                })
              }
              disabled={!saveSearchName.trim() || saveSearch.isPending}
            >
              {saveSearch.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
