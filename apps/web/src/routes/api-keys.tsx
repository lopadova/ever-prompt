import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Shield,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { api } from '@/lib/api';
import { useClipboard } from '@/hooks/use-clipboard';
import { formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiKey } from '@everprompt/shared';

interface NewKeyResponse {
  key: ApiKey;
  raw_key: string;
}

export function ApiKeysPage() {
  const queryClient = useQueryClient();
  const { copy } = useClipboard();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: () => api.get<ApiKey[]>('/api-keys'),
  });

  const createKey = useMutation({
    mutationFn: (name: string) =>
      api.post<NewKeyResponse>('/api-keys', { name }),
    onSuccess: (data) => {
      setGeneratedKey(data.raw_key);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key created');
    },
    onError: (err) => {
      toast.error(`Failed to create key: ${err.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: (key: ApiKey) =>
      api.patch<ApiKey>(`/api-keys/${key.id}`, { is_active: !key.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key revoked');
      setRevokeId(null);
    },
  });

  const handleCopyKey = async () => {
    if (generatedKey) {
      await copy(generatedKey, 'API key');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">API Keys</h1>
            <p className="text-sm text-zinc-500">
              Manage API keys for the Claude CLI plugin and other integrations.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Generate Key
          </Button>
        </div>

        {/* Keys list */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-lg border border-zinc-800 bg-zinc-900 animate-pulse"
              />
            ))
          ) : keys && keys.length > 0 ? (
            keys.map((key) => (
              <div
                key={key.id}
                className={cn(
                  'rounded-lg border bg-zinc-900 p-4 transition-colors',
                  key.is_active
                    ? 'border-zinc-800'
                    : 'border-zinc-800/50 opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Key
                      className={cn(
                        'h-4 w-4 shrink-0',
                        key.is_active ? 'text-indigo-400' : 'text-zinc-600',
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {key.name}
                      </p>
                      <p className="text-xs font-mono text-zinc-500">
                        {key.key_prefix}...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Active toggle */}
                    <button
                      onClick={() => toggleActive.mutate(key)}
                      className={cn(
                        'h-6 rounded-full px-2.5 text-[10px] font-medium transition-colors',
                        key.is_active
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700',
                      )}
                    >
                      {key.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setRevokeId(key.id)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-600">
                  {/* Permissions */}
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {key.permissions.map((perm) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="h-4 text-[9px] px-1"
                      >
                        {perm}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-zinc-700">|</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {key.last_used_at
                      ? `Last used ${formatDate(key.last_used_at)}`
                      : 'Never used'}
                  </div>
                  <span className="text-zinc-700">|</span>
                  <span>Created {formatDate(key.created_at)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
              <Key className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
              <p className="text-sm text-zinc-500">No API keys yet.</p>
              <p className="text-xs text-zinc-600">
                Create one to use with the Claude CLI plugin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create key dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setGeneratedKey(null);
            setCopied(false);
            setNewKeyName('');
          }
          setCreateOpen(open);
        }}
      >
        <DialogContent>
          {!generatedKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Generate API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for plugin or integration use. The key will
                  only be shown once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">
                  Key name
                </label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder='e.g. "Claude CLI" or "Browser Extension"'
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newKeyName.trim()) {
                      createKey.mutate(newKeyName.trim());
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createKey.mutate(newKeyName.trim())}
                  disabled={!newKeyName.trim() || createKey.isPending}
                >
                  {createKey.isPending ? 'Generating...' : 'Generate'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  <span className="flex items-center gap-1.5 text-orange-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Copy this key now. It will not be shown again.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-indigo-400 break-all select-all">
                    {generatedKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyKey}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => {
                  setCreateOpen(false);
                  setGeneratedKey(null);
                  setCopied(false);
                }}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <ConfirmDialog
        open={!!revokeId}
        onOpenChange={(open) => {
          if (!open) setRevokeId(null);
        }}
        title="Revoke API Key"
        description="This will permanently revoke this API key. Any integrations using it will stop working."
        confirmText="Revoke"
        variant="destructive"
        onConfirm={() => {
          if (revokeId) revokeKey.mutate(revokeId);
        }}
        loading={revokeKey.isPending}
      />
    </div>
  );
}
