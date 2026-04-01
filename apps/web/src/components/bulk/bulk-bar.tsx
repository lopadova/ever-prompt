import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  FolderInput,
  Star,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useSelectionStore } from '@/stores/selection.store';
import { useBulkTag, useBulkMove, useBulkFavorite, useBulkReanalyze } from '@/hooks/use-bulk';
import { useTags, useProjects } from '@/hooks/use-taxonomy';
import { DeleteConfirm } from './delete-confirm';
import { pluralize } from '@/lib/utils';

export function BulkBar() {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const clear = useSelectionStore((s) => s.clear);
  const count = selectedIds.size;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const bulkFavorite = useBulkFavorite();
  const bulkReanalyze = useBulkReanalyze();
  const bulkTag = useBulkTag();
  const bulkMove = useBulkMove();

  const { data: allTags } = useTags();
  const { data: allProjects } = useProjects();

  const ids = Array.from(selectedIds);

  if (count === 0) return null;

  function handleBulkTag() {
    if (!selectedTagId) return;
    bulkTag.mutate(
      { prompt_ids: ids, add_tag_ids: [selectedTagId] },
      {
        onSuccess: () => {
          setTagDialogOpen(false);
          setSelectedTagId('');
        },
      },
    );
  }

  function handleBulkMove() {
    if (!selectedProjectId) return;
    bulkMove.mutate(
      { prompt_ids: ids, project_id: selectedProjectId },
      {
        onSuccess: () => {
          setMoveDialogOpen(false);
          setSelectedProjectId('');
        },
      },
    );
  }

  return (
    <>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-2.5 shadow-2xl shadow-black/50 backdrop-blur-xl">
              {/* Count */}
              <span className="mr-1 text-sm font-medium text-zinc-100 tabular-nums">
                {count} {pluralize(count, 'prompt')} selected
              </span>

              <div className="mx-2 h-5 w-px bg-zinc-700" />

              {/* P8: Tag action */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-400 hover:text-zinc-100"
                onClick={() => setTagDialogOpen(true)}
              >
                <Tag className="h-3.5 w-3.5 mr-1" />
                Tag
              </Button>

              {/* P8: Move action */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-400 hover:text-zinc-100"
                onClick={() => setMoveDialogOpen(true)}
              >
                <FolderInput className="h-3.5 w-3.5 mr-1" />
                Move
              </Button>

              {/* P8: Favorite action */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-400 hover:text-zinc-100"
                onClick={() => bulkFavorite.mutate({ prompt_ids: ids })}
                disabled={bulkFavorite.isPending}
              >
                <Star className="h-3.5 w-3.5 mr-1" />
                Favorite
              </Button>

              {/* P8: Re-analyze action */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-400 hover:text-zinc-100"
                onClick={() => bulkReanalyze.mutate({ prompt_ids: ids })}
                disabled={bulkReanalyze.isPending}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Re-analyze
              </Button>

              {/* P8: Delete action */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>

              <div className="mx-2 h-5 w-px bg-zinc-700" />

              {/* Close */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clear}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        count={count}
        promptIds={ids}
      />

      {/* P8: Bulk tag dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
            <DialogDescription>
              Add a tag to {count} selected {pluralize(count, 'prompt')}.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedTagId} onValueChange={setSelectedTagId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tag..." />
            </SelectTrigger>
            <SelectContent>
              {allTags?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkTag} disabled={!selectedTagId || bulkTag.isPending}>
              {bulkTag.isPending ? 'Applying...' : 'Apply Tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* P8: Bulk move dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Project</DialogTitle>
            <DialogDescription>
              Move {count} selected {pluralize(count, 'prompt')} to a project.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {allProjects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: p.color ?? '#6366f1' }}
                    />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkMove} disabled={!selectedProjectId || bulkMove.isPending}>
              {bulkMove.isPending ? 'Moving...' : 'Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
