import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/50">
        <Icon className="h-6 w-6 text-zinc-500" />
      </div>
      <h3 className="mb-1 text-sm font-medium text-zinc-300">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-zinc-500">{description}</p>
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
