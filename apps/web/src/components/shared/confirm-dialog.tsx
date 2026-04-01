import { useState } from 'react';
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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  requireTyping?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  requireTyping,
  variant = 'default',
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  const canConfirm = requireTyping ? typed === requireTyping : true;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm();
    setTyped('');
  }

  function handleOpenChange(next: boolean) {
    if (!next) setTyped('');
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requireTyping && (
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              Type{' '}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-red-400">
                {requireTyping}
              </code>{' '}
              to confirm:
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireTyping}
              autoFocus
            />
          </div>
        )}
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
