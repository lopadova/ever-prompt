import { useRef, useEffect, useState } from 'react';
import { Search, Clock, Bookmark, Hash, FolderKanban } from 'lucide-react';
import { useSearchSuggestions } from '@/hooks/use-search';
import { cn } from '@/lib/utils';

interface AutocompleteProps {
  query: string;
  visible: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function Autocomplete({ query, visible, onSelect, onClose }: AutocompleteProps) {
  const { data: suggestions, isLoading } = useSearchSuggestions(query);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  useEffect(() => {
    if (!visible) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (!suggestions?.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        onSelect(suggestions[activeIndex].value);
      } else if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, suggestions, activeIndex, onSelect, onClose]);

  if (!visible || !query || query.length < 2) return null;

  const iconMap = {
    prompt: Clock,
    saved_search: Bookmark,
    operator: Hash,
  } as const;

  return (
    <div
      ref={listRef}
      className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl"
    >
      {isLoading ? (
        <div className="px-3 py-2 text-xs text-zinc-500">Searching...</div>
      ) : suggestions && suggestions.length > 0 ? (
        <div className="max-h-64 overflow-y-auto py-1">
          {suggestions.map((suggestion, i) => {
            const Icon = iconMap[suggestion.type] ?? Search;
            return (
              <button
                key={`${suggestion.type}-${suggestion.value}-${i}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(suggestion.value);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                  activeIndex === i
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{suggestion.label}</span>
                </div>
                <span className="shrink-0 text-[10px] text-zinc-600 capitalize">
                  {suggestion.type === 'saved_search' ? 'saved' : suggestion.type}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-zinc-500">No suggestions</div>
      )}
    </div>
  );
}
