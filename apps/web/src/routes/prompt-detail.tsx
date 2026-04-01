import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Pin,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Pencil,
  Save,
  X,
  Tags,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoreBadge } from '@/components/prompt/score-badge';
import { ScoreBars } from '@/components/prompt/score-bars';
import { ScoreRadar } from '@/components/prompt/score-radar';
import { DiffViewer } from '@/components/prompt/diff-viewer';
import { VersionList } from '@/components/prompt/version-list';
import { SimilarList } from '@/components/prompt/similar-list';
import { Notes } from '@/components/prompt/notes';
import { PromptEditor } from '@/components/prompt/prompt-editor';
import { TagPill } from '@/components/taxonomy/tag-pill';
import { DetailSkeleton } from '@/components/shared/loading-skeleton';
import { TagAutosuggest } from '@/components/shared/tag-autosuggest';
import {
  usePromptDetail,
  usePromptSimilar,
  useUpdatePrompt,
  useAnalyzePrompt,
} from '@/hooks/use-prompts';
import { useTags, useCreateTag } from '@/hooks/use-taxonomy';
import { useSessionDetail } from '@/hooks/use-sessions';
import { useClipboard } from '@/hooks/use-clipboard';
import { useSearchStore } from '@/stores/search.store';
import { formatDate, cn } from '@/lib/utils';
import { QUALITY_BANDS } from '@everprompt/shared';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { promptKeys } from '@/hooks/use-prompts';
import { toast } from 'sonner';
import type { PromptVersion, SecurityIssue } from '@everprompt/shared';

export function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: prompt, isLoading, error } = usePromptDetail(id);
  const { data: similar } = usePromptSimilar(id);
  const updatePrompt = useUpdatePrompt(id!);
  const analyzePrompt = useAnalyzePrompt(id!);
  const { copy } = useClipboard();
  const [copied, setCopied] = useState(false);
  const { setFilters, resetFilters } = useSearchStore();

  // P4: Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // P3: Tag editing state
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [isApplyingImproved, setIsApplyingImproved] = useState(false);
  const { data: allTags } = useTags();
  const createTag = useCreateTag();

  // P4: Version viewing state
  const [viewingVersion, setViewingVersion] = useState<PromptVersion | null>(null);

  // Session detail (only fetched if prompt has session_id)
  const { data: sessionData } = useSessionDetail(prompt?.session_id ?? undefined);

  if (isLoading || !prompt) {
    return <DetailSkeleton />;
  }

  // P5: Null-safe access
  const review = prompt.latest_review ?? null;
  const tags = prompt.tags ?? [];
  const versions = prompt.versions ?? [];
  const notes = prompt.notes ?? [];
  const isAnalyzing = prompt.ai_status === 'analyzing' || prompt.ai_status === 'pending';

  // Parse security issues from JSON
  const securityIssues: SecurityIssue[] = (() => {
    if (!prompt.has_security_issues) return [];
    const raw = (prompt as unknown as { security_issues_json?: string }).security_issues_json;
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  })();

  // Parse recommended_actions: might be JSON string or already an array
  const recommendedActions: string[] = (() => {
    if (!review?.recommended_actions) return [];
    if (Array.isArray(review.recommended_actions)) return review.recommended_actions;
    if (typeof review.recommended_actions === 'string') {
      try { return JSON.parse(review.recommended_actions); } catch { return []; }
    }
    return [];
  })();

  const handleCopy = async () => {
    await copy(prompt.body_original, 'Prompt');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // P2/P3: Tag click handler - set filter and navigate
  const handleTagClick = (tagId: string) => {
    resetFilters();
    setFilters({ tag_ids: [tagId] });
    navigate('/prompts');
  };

  // P4: Start editing
  const handleStartEdit = () => {
    setEditBody(prompt.body_original);
    setIsEditing(true);
    setViewingVersion(null);
  };

  // P4: Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditBody('');
  };

  // P4: Save edited prompt
  const handleSave = async () => {
    if (!editBody.trim() || editBody === prompt.body_original) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await updatePrompt.mutateAsync({ body_original: editBody });
      setIsEditing(false);
      setEditBody('');
      toast.success('Prompt saved as new version');
    } catch (err) {
      toast.error('Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  // P3: Add tag to prompt
  const handleAddTag = async (tagId: string) => {
    try {
      await api.post(`/prompts/${prompt.id}/tags`, { tag_id: tagId, origin: 'manual' });
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(prompt.id) });
    } catch (err) {
      toast.error('Failed to add tag');
    }
  };

  // P3: Remove tag from prompt
  const handleRemoveTag = async (tagId: string) => {
    try {
      await api.delete(`/prompts/${prompt.id}/tags/${tagId}`);
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(prompt.id) });
    } catch (err) {
      toast.error('Failed to remove tag');
    }
  };

  // Apply improved version from AI review
  const handleApplyImproved = async () => {
    if (!review?.improved_prompt_md) return;
    setIsApplyingImproved(true);
    try {
      await api.post(`/prompts/${prompt.id}/versions`, {
        body: review.improved_prompt_md,
        kind: 'improved_ai',
      });
      await api.patch(`/prompts/${prompt.id}`, {
        body_original: review.improved_prompt_md,
      });
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(prompt.id) });
      toast.success('Applied improved version');
    } catch (err) {
      toast.error('Failed to apply improved version');
    } finally {
      setIsApplyingImproved(false);
    }
  };

  // Create a new tag and immediately add it to the prompt
  const handleCreateAndAddTag = async (name: string) => {
    try {
      const tag = await createTag.mutateAsync({ name });
      await handleAddTag(tag.id);
    } catch (err) {
      toast.error('Failed to create tag');
    }
  };

  return (
    <div>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Back nav */}
        <button
          onClick={() => navigate('/prompts')}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to prompts
        </button>

        {/* === HEADER === */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold text-zinc-100 leading-tight">
              {prompt.title || 'Untitled Prompt'}
            </h1>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => updatePrompt.mutate({ is_favorite: !prompt.is_favorite })}
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    prompt.is_favorite ? 'text-yellow-400 fill-current' : 'text-zinc-500',
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => updatePrompt.mutate({ is_pinned: !prompt.is_pinned })}
              >
                <Pin
                  className={cn(
                    'h-4 w-4',
                    prompt.is_pinned ? 'text-indigo-400 fill-current' : 'text-zinc-500',
                  )}
                />
              </Button>
            </div>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {prompt.project && (
              <span className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: prompt.project.color ?? '#6366f1' }}
                />
                {prompt.project.name}
              </span>
            )}
            {prompt.project && prompt.category && (
              <ChevronRight className="h-3 w-3 text-zinc-700" />
            )}
            {prompt.category && <span>{prompt.category.name}</span>}
            <span className="text-zinc-700">|</span>
            <Badge variant="outline" className="text-[10px] h-5">
              {prompt.language?.toUpperCase() || 'EN'}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5">
              {prompt.source}
            </Badge>
            {sessionData && (
              <button
                onClick={() => {
                  resetFilters();
                  setFilters({ session_id: prompt.session_id! });
                  navigate('/prompts');
                }}
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                {sessionData.name}
              </button>
            )}
            <Badge
              variant={prompt.status === 'active' ? 'success' : 'secondary'}
              className="text-[10px] h-5"
            >
              {prompt.status}
            </Badge>
            {isAnalyzing && (
              <Badge variant="default" className="text-[10px] h-5">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Analyzing
              </Badge>
            )}
            <span className="text-zinc-700">|</span>
            <span>Created {formatDate(prompt.created_at)}</span>
            <span>Updated {formatDate(prompt.updated_at)}</span>
          </div>

          {/* P3: Tags section - always displayed, with edit mode */}
          <div className="space-y-2">
            {isEditingTags ? (
              <TagAutosuggest
                allTags={allTags ?? []}
                selectedTagIds={tags.map((t) => t.id)}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
                onCreate={handleCreateAndAddTag}
                placeholder="Search or create tags..."
              />
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <TagPill
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      onClick={() => handleTagClick(tag.id)}
                    />
                  ))
                ) : (
                  <span className="text-xs text-zinc-600">No tags</span>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-zinc-500"
              onClick={() => setIsEditingTags(!isEditingTags)}
            >
              {isEditingTags ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Done
                </>
              ) : (
                <>
                  <Tags className="h-3 w-3 mr-1" />
                  Edit Tags
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* === SECURITY WARNING === */}
        {prompt.has_security_issues && securityIssues.length > 0 && (
          <>
            <section className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                <h2 className="text-sm font-semibold text-red-400">
                  Security Issues Detected ({securityIssues.length})
                </h2>
              </div>
              <div className="space-y-2">
                {securityIssues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-md border border-red-500/20 bg-zinc-900/50 px-3 py-2"
                  >
                    <span
                      className={cn(
                        'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                        issue.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : issue.severity === 'high'
                            ? 'bg-orange-500/20 text-orange-400'
                            : issue.severity === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-zinc-500/20 text-zinc-400',
                      )}
                    >
                      {issue.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300">{issue.description}</p>
                      <code className="mt-1 block text-[11px] text-red-300/70 font-mono truncate">
                        {issue.matched_text}
                      </code>
                    </div>
                    <span className="shrink-0 text-[10px] text-zinc-600 uppercase">
                      {issue.type.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <Separator />
          </>
        )}

        {/* === PROMPT BODY === */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">
              {viewingVersion
                ? `Version v${viewingVersion.version_no}`
                : 'Prompt Body'}
            </h2>
            <div className="flex items-center gap-2">
              {/* P4: Edit/Save/Cancel buttons */}
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {viewingVersion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setViewingVersion(null)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Back to current
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1 text-green-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
          <PromptEditor
            value={isEditing ? editBody : (viewingVersion?.body ?? prompt.body_original)}
            onChange={isEditing ? setEditBody : undefined}
            readOnly={!isEditing}
          />
          <div className="mt-2 flex items-center gap-4 text-[10px] text-zinc-600">
            <span className="tabular-nums">{prompt.word_count ?? 0} words</span>
            <span className="tabular-nums">{prompt.char_count ?? 0} chars</span>
          </div>
        </section>

        <Separator />

        {/* === AI QUALITY REVIEW === */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">AI Quality Review</h2>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => analyzePrompt.mutate()}
              disabled={analyzePrompt.isPending || isAnalyzing}
            >
              {analyzePrompt.isPending || isAnalyzing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Re-analyze
                </>
              )}
            </Button>
          </div>

          {review ? (
            <div className="space-y-6">
              {/* Overall score + verdict */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center gap-4 mb-3">
                  <ScoreBadge
                    band={review.quality_band}
                    score={review.overall_score}
                    size="lg"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-zinc-200">{review.short_verdict}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Analyzed by {review.model_name} on {formatDate(review.created_at)}
                    </p>
                  </div>
                </div>

                {/* Overall bar */}
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${review.overall_score ?? 0}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor:
                        review.quality_band ? QUALITY_BANDS[review.quality_band]?.color : '#6366f1',
                    }}
                  />
                </div>
              </div>

              {/* Dimension scores */}
              <Tabs defaultValue="bars">
                <TabsList>
                  <TabsTrigger value="bars">Score Bars</TabsTrigger>
                  <TabsTrigger value="radar">Radar</TabsTrigger>
                </TabsList>
                <TabsContent value="bars" className="mt-3">
                  <ScoreBars review={review} />
                </TabsContent>
                <TabsContent value="radar" className="mt-3">
                  <ScoreRadar review={review} />
                </TabsContent>
              </Tabs>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Strengths
                  </h3>
                  <div className="prose-sm text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                    {review.strengths_md}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-orange-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Weaknesses
                  </h3>
                  <div className="prose-sm text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                    {review.weaknesses_md}
                  </div>
                </div>
              </div>

              {/* Recommended actions */}
              {recommendedActions.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="mb-2 text-xs font-semibold text-zinc-300">
                    Recommended Actions
                  </h3>
                  <ul className="space-y-1.5">
                    {recommendedActions.map((action: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                        <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-zinc-700 bg-zinc-800" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
              <p className="text-sm text-zinc-500">
                {isAnalyzing
                  ? 'AI analysis in progress...'
                  : 'No AI review available yet. Click Re-analyze to start.'}
              </p>
            </div>
          )}
        </section>

        <Separator />

        {/* === IMPROVED VERSION === */}
        {review?.improved_prompt_md && (
          <>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-300">
                  Improved Version
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => copy(review.improved_prompt_md, 'Improved prompt')}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleApplyImproved}
                    disabled={isApplyingImproved}
                  >
                    {isApplyingImproved ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      'Apply as new version'
                    )}
                  </Button>
                </div>
              </div>
              <DiffViewer
                original={prompt.body_original}
                improved={review.improved_prompt_md}
              />
            </section>
            <Separator />
          </>
        )}

        {/* === VERSIONS === */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            Versions ({versions.length})
          </h2>
          <VersionList
            versions={versions}
            onView={(version) => setViewingVersion(version)}
          />
        </section>

        <Separator />

        {/* === SIMILAR PROMPTS === */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            Similar Prompts
          </h2>
          <SimilarList prompts={similar ?? []} />
        </section>

        <Separator />

        {/* === NOTES === */}
        <section className="pb-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            Notes ({notes.length})
          </h2>
          <Notes promptId={prompt.id} notes={notes} />
        </section>
      </div>
    </div>
  );
}
