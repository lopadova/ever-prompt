import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { promptKeys } from '@/hooks/use-prompts';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Note } from '@everprompt/shared';

interface NotesProps {
  promptId: string;
  notes: Note[];
}

export function Notes({ promptId, notes }: NotesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const queryClient = useQueryClient();

  const addNote = useMutation({
    mutationFn: (noteBody: string) =>
      api.post<Note>(`/prompts/${promptId}/notes`, { body: noteBody }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(promptId) });
      setIsAdding(false);
      setBody('');
      toast.success('Note added');
    },
  });

  const updateNote = useMutation({
    mutationFn: ({ id, noteBody }: { id: string; noteBody: string }) =>
      api.patch<Note>(`/notes/${id}`, { body: noteBody }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(promptId) });
      setEditingId(null);
      setBody('');
      toast.success('Note updated');
    },
  });

  const deleteNote = useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(promptId) });
      toast.success('Note deleted');
    },
  });

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div
          key={note.id}
          className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
        >
          {editingId === note.id ? (
            <div className="space-y-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => updateNote.mutate({ id: note.id, noteBody: body })}
                  disabled={!body.trim()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setBody('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{note.body}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-zinc-600">
                  {formatDate(note.created_at)}
                  {note.updated_at !== note.created_at && ' (edited)'}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setEditingId(note.id);
                      setBody(note.body);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteNote.mutate(note.id)}
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a note..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => addNote.mutate(body)}
              disabled={!body.trim()}
            >
              Add Note
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setBody('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Note
        </Button>
      )}
    </div>
  );
}
