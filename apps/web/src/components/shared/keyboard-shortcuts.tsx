import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useUiStore } from '@/stores/ui.store';

const shortcuts = [
  { category: 'Global', items: [
    { keys: ['Cmd', 'K'], description: 'Command palette' },
    { keys: ['Cmd', 'N'], description: 'New prompt' },
    { keys: ['Cmd', 'F'], description: 'Focus search' },
    { keys: ['Cmd', '\\'], description: 'Toggle left sidebar' },
    { keys: ['Cmd', '/'], description: 'Toggle right sidebar' },
    { keys: ['?'], description: 'Show this help' },
  ]},
  { category: 'Navigation', items: [
    { keys: ['G', 'D'], description: 'Go to Dashboard' },
    { keys: ['G', 'I'], description: 'Go to Inbox' },
    { keys: ['G', 'A'], description: 'Go to All Prompts' },
    { keys: ['J'], description: 'Next item' },
    { keys: ['K'], description: 'Previous item' },
    { keys: ['Enter'], description: 'Open selected' },
    { keys: ['Esc'], description: 'Close / Deselect' },
  ]},
  { category: 'Prompt Actions', items: [
    { keys: ['X'], description: 'Toggle select' },
    { keys: ['Cmd', 'A'], description: 'Select all visible' },
    { keys: ['S'], description: 'Toggle star/favorite' },
    { keys: ['P'], description: 'Toggle pin' },
    { keys: ['E'], description: 'Edit mode' },
    { keys: ['Cmd', 'Shift', 'C'], description: 'Copy prompt body' },
  ]},
];

export function KeyboardShortcuts() {
  const { shortcutsDialogOpen, setShortcutsDialogOpen } = useUiStore();

  return (
    <Dialog open={shortcutsDialogOpen} onOpenChange={setShortcutsDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate EverPrompt faster with keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {section.category}
              </h4>
              <div className="space-y-1.5">
                {section.items.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-zinc-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] text-zinc-400">
                            {key === 'Cmd' ? '\u2318' : key === 'Shift' ? '\u21E7' : key}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="mx-0.5 text-zinc-600 text-[10px]">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
