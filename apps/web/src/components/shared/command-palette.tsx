import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router';
import {
  FileText,
  Search,
  LayoutDashboard,
  Settings,
  Star,
  Inbox,
  TrendingDown,
  Plus,
  Clock,
} from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { useSearchStore } from '@/stores/search.store';

export function CommandPalette() {
  const navigate = useNavigate();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUiStore();
  const { setFilters, resetFilters } = useSearchStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!commandPaletteOpen) {
      setSearch('');
    }
  }, [commandPaletteOpen]);

  function runAction(fn: () => void) {
    fn();
    setCommandPaletteOpen(false);
  }

  return (
    <Command.Dialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      label="Command palette"
      className="fixed inset-0 z-50"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command or search..."
          className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-zinc-500">
            No results found.
          </Command.Empty>

          <Command.Group
            heading="Actions"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-zinc-500"
          >
            <CommandItem
              icon={Plus}
              label="New Prompt"
              shortcut="Cmd+N"
              onSelect={() => runAction(() => navigate('/prompts/new'))}
            />
            <CommandItem
              icon={Search}
              label="Search Prompts"
              shortcut="Cmd+F"
              onSelect={() =>
                runAction(() => {
                  navigate('/prompts');
                  setTimeout(() => {
                    document.querySelector<HTMLInputElement>('[data-search-input]')?.focus();
                  }, 100);
                })
              }
            />
            <CommandItem
              icon={LayoutDashboard}
              label="Go to Dashboard"
              shortcut="G D"
              onSelect={() => runAction(() => navigate('/dashboard'))}
            />
            <CommandItem
              icon={Settings}
              label="Settings"
              onSelect={() => runAction(() => navigate('/settings'))}
            />
          </Command.Group>

          <Command.Group
            heading="Quick Filters"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-zinc-500"
          >
            <CommandItem
              icon={Star}
              label="Show Favorites"
              onSelect={() =>
                runAction(() => {
                  resetFilters();
                  setFilters({ is_favorite: true });
                  navigate('/prompts');
                })
              }
            />
            <CommandItem
              icon={Inbox}
              label="Show Inbox"
              onSelect={() =>
                runAction(() => {
                  resetFilters();
                  setFilters({ status: 'inbox' });
                  navigate('/prompts');
                })
              }
            />
            <CommandItem
              icon={TrendingDown}
              label="Needs Improvement"
              onSelect={() =>
                runAction(() => {
                  resetFilters();
                  setFilters({ quality_band: ['C', 'D'] });
                  navigate('/prompts');
                })
              }
            />
            <CommandItem
              icon={Clock}
              label="Recent Prompts"
              onSelect={() =>
                runAction(() => {
                  resetFilters();
                  navigate('/prompts');
                })
              }
            />
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

function CommandItem({
  icon: Icon,
  label,
  shortcut,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-zinc-300 outline-none data-[selected=true]:bg-zinc-800 data-[selected=true]:text-zinc-100"
    >
      <Icon className="h-4 w-4 text-zinc-500" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-zinc-600 font-mono">{shortcut}</span>
      )}
    </Command.Item>
  );
}
