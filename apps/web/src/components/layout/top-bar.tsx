import { Search, Moon, Sun, Settings, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useUiStore } from '@/stores/ui.store';

export function TopBar() {
  const navigate = useNavigate();
  const { theme, toggleTheme, setCommandPaletteOpen } = useUiStore();

  return (
    <header className="flex h-12 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4">
      {/* Left: Logo */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => navigate('/dashboard')}
      >
        <Sparkles className="h-5 w-5 text-indigo-400" />
        <span className="text-sm font-semibold tracking-tight text-zinc-100">
          EverPrompt
        </span>
      </div>

      {/* Center: Search trigger */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex h-8 w-96 max-w-md items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-400"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search or type /...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400 sm:flex">
          <span className="text-xs">&#x2318;</span>K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-zinc-400" />
              ) : (
                <Sun className="h-4 w-4 text-zinc-400" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-4 w-4 text-zinc-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
