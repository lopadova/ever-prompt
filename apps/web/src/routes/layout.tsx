import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Shell } from '@/components/layout/shell';
import { CommandPalette } from '@/components/shared/command-palette';
import { KeyboardShortcuts } from '@/components/shared/keyboard-shortcuts';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard';
import { useUiStore } from '@/stores/ui.store';

export function Layout() {
  useKeyboardShortcuts();

  const theme = useUiStore((s) => s.theme);
  const density = useUiStore((s) => s.density);

  // P7: Apply theme and density to document on mount and when they change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  return (
    <>
      <Shell>
        <Outlet />
      </Shell>
      <CommandPalette />
      <KeyboardShortcuts />
    </>
  );
}
