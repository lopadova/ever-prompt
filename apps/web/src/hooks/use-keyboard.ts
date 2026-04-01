import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useUiStore } from '@/stores/ui.store';

type KeyHandler = (e: KeyboardEvent) => void;

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

function isModKey(e: KeyboardEvent): boolean {
  return isMac ? e.metaKey : e.ctrlKey;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const {
    setCommandPaletteOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
    setShortcutsDialogOpen,
  } = useUiStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Cmd+K: Command palette (always active)
      if (isModKey(e) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Cmd+N: New prompt
      if (isModKey(e) && e.key === 'n') {
        e.preventDefault();
        navigate('/prompts/new');
        return;
      }

      // Cmd+F: Focus search
      if (isModKey(e) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
        searchInput?.focus();
        return;
      }

      // Cmd+\: Toggle left sidebar
      if (isModKey(e) && e.key === '\\') {
        e.preventDefault();
        toggleLeftSidebar();
        return;
      }

      // Cmd+/: Toggle right sidebar
      if (isModKey(e) && e.key === '/') {
        e.preventDefault();
        toggleRightSidebar();
        return;
      }

      // Cmd+Shift+C: Copy prompt body (handled in detail view)

      // Single-key shortcuts only when not in input
      if (isInput) return;

      // ?: Show shortcuts help
      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault();
        setShortcutsDialogOpen(true);
        return;
      }

      // G-sequence shortcuts
      if (e.key === 'g') {
        const handleSecondKey = (e2: KeyboardEvent) => {
          window.removeEventListener('keydown', handleSecondKey);
          switch (e2.key) {
            case 'd':
              e2.preventDefault();
              navigate('/dashboard');
              break;
            case 'i':
              e2.preventDefault();
              navigate('/prompts?status=inbox');
              break;
            case 'a':
              e2.preventDefault();
              navigate('/prompts');
              break;
          }
        };
        window.addEventListener('keydown', handleSecondKey, { once: true });
        setTimeout(() => window.removeEventListener('keydown', handleSecondKey), 1000);
        return;
      }
    },
    [navigate, setCommandPaletteOpen, toggleLeftSidebar, toggleRightSidebar, setShortcutsDialogOpen],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useKeyHandler(key: string, handler: KeyHandler, deps: unknown[] = []) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === key) handler(e);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, handler, ...deps]);
}
