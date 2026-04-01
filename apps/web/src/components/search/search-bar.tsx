import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useSearchStore } from '@/stores/search.store';
import { SEARCH_OPERATORS } from '@everprompt/shared';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

export function SearchBar({ onFocus, onBlur, className }: SearchBarProps) {
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const [local, setLocal] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync store -> local when store changes externally
  useEffect(() => {
    setLocal(query);
  }, [query]);

  const commit = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setQuery(value);
    },
    [setQuery],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocal(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commit(value), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit(local);
    }
    if (e.key === 'Escape') {
      setLocal('');
      commit('');
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setLocal('');
    commit('');
    inputRef.current?.focus();
  };

  // Highlight DSL operators in a preview overlay
  const renderHighlighted = () => {
    if (!local) return null;
    const parts = local.split(/(\s+)/);
    return parts.map((part, i) => {
      const opMatch = SEARCH_OPERATORS.find(
        (op) => part.startsWith(`${op}:`) || part.startsWith(`${op}>`) || part.startsWith(`${op}<`),
      );
      if (opMatch) {
        const sepIndex = part.indexOf(':') !== -1 ? part.indexOf(':') : part.indexOf('>') !== -1 ? part.indexOf('>') : part.indexOf('<');
        return (
          <span key={i}>
            <span className="text-indigo-400">{part.slice(0, sepIndex + 1)}</span>
            <span className="text-zinc-100">{part.slice(sepIndex + 1)}</span>
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={local}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Search prompts... (project:, tag:, score>, band:)"
          className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-9 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          autoComplete="off"
          spellCheck={false}
        />
        {local && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {/* Operator hints */}
      {local && !local.includes(':') && !local.includes('>') && !local.includes('<') && (
        <div className="absolute top-full left-0 mt-1 flex flex-wrap gap-1 px-1 py-1 text-[10px] text-zinc-600">
          {['project:', 'tag:', 'score>', 'band:', 'lang:', 'is:'].map((hint) => (
            <button
              key={hint}
              onMouseDown={(e) => {
                e.preventDefault();
                const next = local ? `${local} ${hint}` : hint;
                setLocal(next);
                inputRef.current?.focus();
              }}
              className="rounded border border-zinc-800 bg-zinc-900/50 px-1.5 py-0.5 font-mono hover:bg-zinc-800 hover:text-zinc-400 transition-colors"
            >
              {hint}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
