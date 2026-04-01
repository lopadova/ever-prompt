import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Pencil, Trash2, Check, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessions, useUpdateSession, useDeleteSession } from '@/hooks/use-sessions';
import { useSearchStore } from '@/stores/search.store';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Session } from '@everprompt/shared';

function SessionRow({ session }: { session: Session }) {
  const navigate = useNavigate();
  const { resetFilters, setFilters } = useSearchStore();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);

  const handleNavigate = () => {
    resetFilters();
    setFilters({ session_id: session.id });
    navigate('/prompts');
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName === session.name) {
      setIsEditing(false);
      return;
    }
    try {
      await updateSession.mutateAsync({ id: session.id, name: editName.trim() });
      setIsEditing(false);
      toast.success('Session renamed');
    } catch {
      toast.error('Failed to rename session');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSession.mutateAsync(session.id);
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  return (
    <div className="group flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition-colors hover:border-zinc-700">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSaveName}
              className="h-6 w-6"
            >
              <Check className="h-3.5 w-3.5 text-green-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { setIsEditing(false); setEditName(session.name); }}
              className="h-6 w-6"
            >
              <X className="h-3.5 w-3.5 text-zinc-500" />
            </Button>
          </div>
        ) : (
          <button
            onClick={handleNavigate}
            className="block w-full text-left"
          >
            <p className="text-sm font-medium text-zinc-200 truncate hover:text-indigo-400 transition-colors">
              {session.name}
            </p>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {session.prompt_count} prompt{session.prompt_count !== 1 ? 's' : ''}
              </span>
              {session.first_prompt_at && (
                <span>Started {formatDate(session.first_prompt_at)}</span>
              )}
              {session.last_prompt_at && (
                <span>Last activity {formatDate(session.last_prompt_at)}</span>
              )}
            </div>
          </button>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => { setEditName(session.name); setIsEditing(true); }}
            className="h-7 w-7"
          >
            <Pencil className="h-3.5 w-3.5 text-zinc-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            className="h-7 w-7"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-400/70" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function SessionsPage() {
  const { data: sessions, isLoading } = useSessions();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Sessions</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Prompts captured from Claude CLI grouped by session.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <MessageSquare className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
          <p className="text-sm text-zinc-500">
            No sessions yet. Sessions are created automatically when prompts are captured from Claude CLI.
          </p>
        </div>
      )}
    </div>
  );
}
