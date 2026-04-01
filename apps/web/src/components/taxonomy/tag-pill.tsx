import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TagPillProps {
  name: string;
  color?: string | null;
  count?: number;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'default';
}

export function TagPill({
  name,
  color,
  count,
  removable,
  onRemove,
  onClick,
  size = 'default',
}: TagPillProps) {
  return (
    <motion.button
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-zinc-700/50 bg-zinc-800/50 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100',
        size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs',
        onClick && 'cursor-pointer',
      )}
      style={
        color
          ? { borderColor: `${color}33`, backgroundColor: `${color}15`, color }
          : undefined
      }
    >
      <span>{name}</span>
      {count !== undefined && (
        <span className="text-[10px] opacity-60">{count}</span>
      )}
      {removable && onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 cursor-pointer hover:text-red-400"
        >
          x
        </span>
      )}
    </motion.button>
  );
}
