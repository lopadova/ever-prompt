import { useState } from 'react';
import { Activity, Database, Loader2, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDashboardStats } from '@/hooks/use-dashboard';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QueueItem {
  prompt_id: string;
  title: string;
  status: string;
  created_at: string;
}

interface QueueStatus {
  pending: number;
  analyzing: number;
  failed: number;
  items: QueueItem[];
}

export function StatusBar() {
  const { data: stats } = useDashboardStats();
  const queryClient = useQueryClient();
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);

  // Fetch queue status always (lightweight poll for status bar count)
  const { data: queueStatus, isLoading: queueLoading } = useQuery<QueueStatus>({
    queryKey: ['queue-status'],
    queryFn: () => api.get<QueueStatus>('/queue/status'),
    refetchInterval: queueDialogOpen ? 5000 : 30000,
  });

  const activeCount = (queueStatus?.pending ?? 0) + (queueStatus?.analyzing ?? 0);

  // P11: Retry failed
  const retryFailed = useMutation({
    mutationFn: () => api.post('/queue/retry-failed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Retrying failed prompts');
    },
    onError: (err) => {
      toast.error(`Failed to retry: ${err.message}`);
    },
  });

  // Unstick stuck prompts (>5min in pending/analyzing)
  const unstick = useMutation({
    mutationFn: () => api.post<{ count: number; message: string }>('/queue/unstick'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queue-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast.success(data.message || 'Stuck prompts cleared');
    },
    onError: (err) => {
      toast.error(`Failed to unstick: ${err.message}`);
    },
  });

  return (
    <>
      <footer className="flex h-7 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 text-[11px] text-zinc-500">
        <div className="flex items-center gap-4">
          <span className="tabular-nums">
            {stats?.total_prompts ?? '--'} prompts
          </span>
          {/* P11: Make analyzing text clickable */}
          <button
            onClick={() => setQueueDialogOpen(true)}
            className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
          >
            {activeCount > 0 ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                <span>{activeCount} analyzing</span>
              </>
            ) : (
              <>
                <Activity className="h-3 w-3 text-green-500" />
                <span>Pipeline idle</span>
              </>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Database className={cn('h-3 w-3', 'text-green-500')} />
          <span>D1 ok</span>
        </div>
      </footer>

      {/* P11: Queue status dialog */}
      <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analysis Queue</DialogTitle>
            <DialogDescription>
              Prompts currently being analyzed or waiting in queue.
            </DialogDescription>
          </DialogHeader>

          {queueLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            </div>
          ) : queueStatus ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-zinc-400">
                  Pending: <span className="text-zinc-200 tabular-nums">{queueStatus.pending ?? 0}</span>
                </span>
                <span className="text-zinc-400">
                  Analyzing: <span className="text-zinc-200 tabular-nums">{queueStatus.analyzing ?? 0}</span>
                </span>
                <span className="text-zinc-400">
                  Failed: <span className="text-red-400 tabular-nums">{queueStatus.failed ?? 0}</span>
                </span>
              </div>

              {/* Items list */}
              {(queueStatus.items?.length ?? 0) > 0 ? (
                <div className="max-h-64 overflow-auto space-y-1">
                  {queueStatus.items.map((item) => (
                    <div
                      key={item.prompt_id}
                      className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200 truncate">
                          {item.title || 'Untitled'}
                        </p>
                        <p className="text-[10px] text-zinc-600">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0',
                          item.status === 'analyzing' && 'bg-indigo-500/10 text-indigo-400',
                          item.status === 'pending' && 'bg-zinc-800 text-zinc-400',
                          item.status?.startsWith('failed') && 'bg-red-500/10 text-red-400',
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">
                  No items in queue.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 text-center py-4">
              Unable to load queue status.
            </p>
          )}

          <DialogFooter className="flex gap-2">
            {activeCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => unstick.mutate()}
                disabled={unstick.isPending}
                className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {unstick.isPending ? 'Clearing...' : `Unstick ${activeCount} stuck`}
              </Button>
            )}
            {(queueStatus?.failed ?? 0) > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => retryFailed.mutate()}
                disabled={retryFailed.isPending}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {retryFailed.isPending ? 'Retrying...' : 'Retry Failed'}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setQueueDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
