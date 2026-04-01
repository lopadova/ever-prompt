import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TagAutosuggest } from '@/components/shared/tag-autosuggest';
import { useProjects, useCategories, useTags, useCreateTag } from '@/hooks/use-taxonomy';
import type { CreatePromptInput } from '@everprompt/shared';

interface PromptFormProps {
  onSubmit: (data: CreatePromptInput) => void;
  loading?: boolean;
  defaultValues?: Partial<CreatePromptInput>;
}

export function PromptForm({ onSubmit, loading, defaultValues }: PromptFormProps) {
  const [body, setBody] = useState(defaultValues?.body_original ?? '');
  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [projectId, setProjectId] = useState(defaultValues?.project_id ?? '');
  const [categoryId, setCategoryId] = useState(defaultValues?.category_id ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(defaultValues?.tag_ids ?? []);

  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const createTag = useCreateTag();

  // Simple language detection heuristic based on content
  const detectedLanguage = (() => {
    if (!body) return '';
    const italianWords = ['che', 'per', 'non', 'con', 'sono', 'come', 'questo', 'una', 'del', 'della'];
    const words = body.toLowerCase().split(/\s+/);
    const italianCount = words.filter((w) => italianWords.includes(w)).length;
    return italianCount > 3 ? 'it' : 'en';
  })();

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const charCount = body.length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    onSubmit({
      body_original: body,
      title: title || undefined,
      project_id: projectId || undefined,
      category_id: categoryId || undefined,
      tag_ids: selectedTags.length > 0 ? selectedTags : undefined,
      language: detectedLanguage || undefined,
      source: 'manual',
    });
  }

  async function handleCreateTag(name: string) {
    const tag = await createTag.mutateAsync({ name });
    setSelectedTags((prev) => [...prev, tag.id]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">
          Title <span className="text-zinc-600">(optional, AI will generate if empty)</span>
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for your prompt..."
          className="h-9"
        />
      </div>

      {/* Prompt body */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">
          Prompt body <span className="text-red-400">*</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Paste or write your prompt here..."
          className="w-full min-h-[200px] rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
          rows={10}
          required
        />
        <div className="flex items-center gap-3 text-[10px] text-zinc-600">
          <span className="tabular-nums">{wordCount} words</span>
          <span className="tabular-nums">{charCount} chars</span>
          {detectedLanguage && (
            <Badge variant="outline" className="h-4 text-[10px] px-1.5">
              {detectedLanguage.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* Project & Category row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Project</label>
          <Select
            value={projectId || '__none__'}
            onValueChange={(v) => setProjectId(v === '__none__' ? '' : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="No project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No project</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: p.color ?? '#6366f1' }}
                    />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Category</label>
          <Select
            value={categoryId || '__none__'}
            onValueChange={(v) => setCategoryId(v === '__none__' ? '' : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="No category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No category</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Tags</label>
        <TagAutosuggest
          allTags={tags ?? []}
          selectedTagIds={selectedTags}
          onAdd={(tagId) => {
            if (!selectedTags.includes(tagId)) {
              setSelectedTags((prev) => [...prev, tagId]);
            }
          }}
          onRemove={(tagId) => setSelectedTags((prev) => prev.filter((id) => id !== tagId))}
          onCreate={handleCreateTag}
          placeholder="Search or create tags..."
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={!body.trim() || loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Prompt'
          )}
        </Button>
        <p className="text-xs text-zinc-500">
          AI analysis will start automatically after creation.
        </p>
      </div>
    </form>
  );
}
