import { GitBranch, Eye, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, cn } from '@/lib/utils';
import type { PromptVersion, VersionKind } from '@everprompt/shared';

interface VersionListProps {
  versions: PromptVersion[];
  onView?: (version: PromptVersion) => void;
  onApply?: (version: PromptVersion) => void;
}

const kindLabel: Record<VersionKind, string> = {
  original: 'Original',
  edited: 'Edited',
  improved_ai: 'AI Improved',
  snapshot: 'Snapshot',
};

const kindVariant: Record<VersionKind, 'default' | 'secondary' | 'success' | 'outline'> = {
  original: 'outline',
  edited: 'secondary',
  improved_ai: 'default',
  snapshot: 'outline',
};

export function VersionList({ versions, onView, onApply }: VersionListProps) {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-4">No versions available.</p>
    );
  }

  return (
    <div className="space-y-2">
      {versions.map((version, i) => (
        <div
          key={version.id}
          className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
        >
          <GitBranch className="h-4 w-4 text-zinc-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">
                v{version.version_no}
              </span>
              <Badge variant={kindVariant[version.kind as VersionKind]}>
                {kindLabel[version.kind as VersionKind]}
              </Badge>
            </div>
            <span className="text-xs text-zinc-500">
              {formatDate(version.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onView && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onView(version)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            {onApply && i > 0 && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onApply(version)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
