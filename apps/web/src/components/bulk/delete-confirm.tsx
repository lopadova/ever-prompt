import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBulkDelete } from '@/hooks/use-bulk';
import { pluralize } from '@/lib/utils';

interface DeleteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  promptIds: string[];
}

export function DeleteConfirm({
  open,
  onOpenChange,
  count,
  promptIds,
}: DeleteConfirmProps) {
  const [typed, setTyped] = useState('');
  const bulkDelete = useBulkDelete();

  const canConfirm = typed === 'delete';

  function handleConfirm() {
    if (!canConfirm) return;
    bulkDelete.mutate(
      { prompt_ids: promptIds, confirm: true },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTyped('');
        },
      },
    );
  }

  function handleOpenChange(next: boolean) {
    if (!next) setTyped('');
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <DialogTitle className="text-center">
            Delete {count} {pluralize(count, 'prompt')}?
          </DialogTitle>
          <DialogDescription className="text-center">
            This action cannot be undone. All selected prompts, their versions,
            reviews, and notes will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-zinc-400">
            Type{' '}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-red-400">
              delete
            </code>{' '}
            to confirm:
          </p>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="delete"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={bulkDelete.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || bulkDelete.isPending}
          >
            {bulkDelete.isPending ? 'Deleting...' : `Delete ${count} ${pluralize(count, 'prompt')}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
