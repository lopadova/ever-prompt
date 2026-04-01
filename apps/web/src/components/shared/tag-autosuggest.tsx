import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TagAutosuggestProps {
  allTags: { id: string; name: string; color?: string | null }[];
  selectedTagIds: string[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onCreate?: (name: string) => void;
  placeholder?: string;
}

export function TagAutosuggest({
  allTags,
  selectedTagIds,
  onAdd,
  onRemove,
  onCreate,
  placeholder = 'Search tags...',
}: TagAutosuggestProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));

  const suggestions = query.trim()
    ? allTags
        .filter(
          (t) =>
            !selectedTagIds.includes(t.id) &&
            t.name.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 10)
    : [];

  const exactMatch = suggestions.some(
    (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
  );
  const showCreate = onCreate && query.trim() && !exactMatch;

  const totalItems = suggestions.length + (showCreate ? 1 : 0);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectSuggestion(tagId: string) {
    onAdd(tagId);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleCreate() {
    if (onCreate && query.trim()) {
      onCreate(query.trim());
      setQuery('');
      setOpen(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || totalItems === 0) {
      if (e.key === 'ArrowDown' && query.trim()) {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex < suggestions.length) {
          selectSuggestion(suggestions[highlightIndex].id);
        } else if (showCreate) {
          handleCreate();
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tag chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-300"
              style={
                tag.color
                  ? { borderColor: `${tag.color}33`, backgroundColor: `${tag.color}15`, color: tag.color }
                  : undefined
              }
            >
              {tag.name}
              <button
                type="button"
                onClick={() => onRemove(tag.id)}
                className="ml-0.5 hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
      />

      {/* Dropdown */}
      {open && totalItems > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 py-1 shadow-lg max-h-56 overflow-auto">
          {suggestions.map((tag, i) => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectSuggestion(tag.id)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={cn(
                'flex w-full items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors',
                highlightIndex === i
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/50',
              )}
            >
              {tag.color && (
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
              )}
              <span className="truncate">{tag.name}</span>
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              onMouseEnter={() => setHighlightIndex(suggestions.length)}
              className={cn(
                'flex w-full items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors border-t border-zinc-800',
                highlightIndex === suggestions.length
                  ? 'bg-zinc-800 text-indigo-400'
                  : 'text-indigo-400/70 hover:bg-zinc-800/50',
              )}
            >
              Create &lsquo;{query.trim()}&rsquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
