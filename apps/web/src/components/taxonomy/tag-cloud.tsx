import { useNavigate } from 'react-router';
import { useTags } from '@/hooks/use-taxonomy';
import { useSearchStore } from '@/stores/search.store';
import { TagPill } from './tag-pill';

interface TagCloudProps {
  filter?: string;
}

export function TagCloud({ filter }: TagCloudProps) {
  const navigate = useNavigate();
  const { data: tags } = useTags();
  const { setFilters, resetFilters } = useSearchStore();

  if (!tags || tags.length === 0) {
    return <p className="px-2.5 text-xs text-zinc-600">No tags yet</p>;
  }

  // Show top 20 tags by usage, optionally filtered by name
  const filtered = filter
    ? tags.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
    : tags;
  const topTags = [...filtered].sort((a, b) => b.usage_count - a.usage_count).slice(0, 20);

  if (topTags.length === 0) {
    return <p className="px-2.5 text-xs text-zinc-600">No matching tags</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-2.5">
      {topTags.map((tag) => (
        <TagPill
          key={tag.id}
          name={tag.name}
          color={tag.color}
          count={tag.usage_count}
          onClick={() => {
            resetFilters();
            setFilters({ tag_ids: [tag.id] });
            navigate('/prompts');
          }}
        />
      ))}
    </div>
  );
}
