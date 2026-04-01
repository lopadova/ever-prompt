import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { TopBar } from './top-bar';
import { SidebarLeft } from './sidebar-left';
import { SidebarRight } from './sidebar-right';
import { StatusBar } from './status-bar';
import { BulkBar } from '@/components/bulk/bulk-bar';
import { useUiStore } from '@/stores/ui.store';
import { useSelectionStore } from '@/stores/selection.store';
import { cn } from '@/lib/utils';

export function Shell({ children }: { children: React.ReactNode }) {
  const leftSidebarOpen = useUiStore((s) => s.leftSidebarOpen);
  const rightSidebarOpen = useUiStore((s) => s.rightSidebarOpen);
  const selectedCount = useSelectionStore((s) => s.selectedIds.size);

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <TopBar />

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="everprompt-layout">
          {leftSidebarOpen && (
            <>
              <Panel
                id="left-sidebar"
                order={1}
                defaultSize={16}
                minSize={12}
                maxSize={24}
                className="border-r border-zinc-800"
              >
                <SidebarLeft />
              </Panel>
              <PanelResizeHandle
                className={cn(
                  'w-px bg-zinc-800 hover:bg-indigo-500/50 transition-colors duration-150',
                  'data-[resize-handle-active]:bg-indigo-500',
                )}
              />
            </>
          )}

          <Panel id="main-content" order={2} minSize={40}>
            <main className="h-full overflow-auto">{children}</main>
          </Panel>

          {rightSidebarOpen && (
            <>
              <PanelResizeHandle
                className={cn(
                  'w-px bg-zinc-800 hover:bg-indigo-500/50 transition-colors duration-150',
                  'data-[resize-handle-active]:bg-indigo-500',
                )}
              />
              <Panel
                id="right-sidebar"
                order={3}
                defaultSize={18}
                minSize={14}
                maxSize={28}
                className="border-l border-zinc-800"
              >
                <SidebarRight />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      <StatusBar />
      {selectedCount > 0 && <BulkBar />}
    </div>
  );
}
