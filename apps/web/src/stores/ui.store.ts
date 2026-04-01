import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';
export type ViewMode = 'grid' | 'list';
export type Density = 'compact' | 'comfortable';

interface UiState {
  theme: Theme;
  viewMode: ViewMode;
  density: Density;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  commandPaletteOpen: boolean;
  shortcutsDialogOpen: boolean;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setViewMode: (mode: ViewMode) => void;
  setDensity: (density: Density) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsDialogOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      viewMode: 'grid',
      density: 'compact',
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      commandPaletteOpen: false,
      shortcutsDialogOpen: false,

      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.classList.toggle('light', theme === 'light');
        set({ theme });
      },
      toggleTheme: () =>
        set((s) => {
          const theme = s.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.toggle('dark', theme === 'dark');
          document.documentElement.classList.toggle('light', theme === 'light');
          return { theme };
        }),
      setViewMode: (viewMode) => set({ viewMode }),
      setDensity: (density) => {
        document.documentElement.setAttribute('data-density', density);
        set({ density });
      },
      toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
      setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setShortcutsDialogOpen: (open) => set({ shortcutsDialogOpen: open }),
    }),
    {
      name: 'everprompt-ui',
      partialize: (state) => ({
        theme: state.theme,
        viewMode: state.viewMode,
        density: state.density,
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
      }),
    },
  ),
);
