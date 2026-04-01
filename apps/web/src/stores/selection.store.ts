import { create } from 'zustand';

interface SelectionState {
  selectedIds: Set<string>;

  toggle: (id: string) => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>()((set, get) => ({
  selectedIds: new Set<string>(),

  toggle: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),

  select: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      next.add(id);
      return { selectedIds: next };
    }),

  deselect: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      next.delete(id);
      return { selectedIds: next };
    }),

  selectAll: (ids) =>
    set(() => ({
      selectedIds: new Set(ids),
    })),

  clear: () => set({ selectedIds: new Set<string>() }),

  isSelected: (id) => get().selectedIds.has(id),
}));
