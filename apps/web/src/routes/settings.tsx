import { useState } from 'react';
import { Moon, Sun, LayoutGrid, List, Minimize2, Maximize2, Bot, BrainCircuit, Globe, Cpu, Plus, Trash2, ShieldAlert, Clock, Eye, AlertTriangle, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/stores/ui.store';
import type { Theme, ViewMode, Density } from '@/stores/ui.store';
import { useSettings, useUpdateSettings, type AIProvider } from '@/hooks/use-settings';
import { useTags } from '@/hooks/use-taxonomy';
import { TagAutosuggest } from '@/components/shared/tag-autosuggest';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

// --- Security Patterns types & hooks ---

interface CustomPatternDef {
  pattern: string;
  flags?: string;
  type: 'api_key' | 'password' | 'credit_card' | 'private_key' | 'token' | 'email' | 'ip_address' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

const PATTERN_TYPES = ['api_key', 'password', 'credit_card', 'private_key', 'token', 'email', 'ip_address', 'other'] as const;
const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

const securityKeys = {
  patterns: ['security', 'patterns'] as const,
};

function useSecurityPatterns() {
  return useQuery<CustomPatternDef[]>({
    queryKey: securityKeys.patterns,
    queryFn: () => api.get<CustomPatternDef[]>('/security/patterns'),
  });
}

function useAddPattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomPatternDef) =>
      api.post<CustomPatternDef[]>('/security/patterns', data),
    onSuccess: (data) => {
      queryClient.setQueryData(securityKeys.patterns, data);
    },
  });
}

function useDeletePattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (index: number) =>
      api.delete<CustomPatternDef[]>(`/security/patterns/${index}`),
    onSuccess: (data) => {
      queryClient.setQueryData(securityKeys.patterns, data);
    },
  });
}

// --- AI Providers ---

const AI_PROVIDERS: { id: AIProvider; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'anthropic', label: 'Anthropic', icon: Bot },
  { id: 'openai', label: 'OpenAI', icon: BrainCircuit },
  { id: 'openrouter', label: 'OpenRouter', icon: Globe },
  { id: 'workers-ai', label: 'Workers AI', icon: Cpu },
];

const DEFAULT_MODELS: Record<AIProvider, { classify: string; score: string }> = {
  anthropic: { classify: 'claude-haiku-4-5-20251001', score: 'claude-sonnet-4-20250514' },
  openai: { classify: 'gpt-4o-mini', score: 'gpt-4o' },
  openrouter: { classify: 'anthropic/claude-3.5-haiku', score: 'anthropic/claude-sonnet-4' },
  'workers-ai': { classify: '@cf/meta/llama-3.1-8b-instruct', score: '@cf/meta/llama-3.1-70b-instruct' },
};

export function SettingsPage() {
  const theme = useUiStore((s) => s.theme);
  const viewMode = useUiStore((s) => s.viewMode);
  const density = useUiStore((s) => s.density);
  const setTheme = useUiStore((s) => s.setTheme);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const setDensity = useUiStore((s) => s.setDensity);

  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const currentProvider: AIProvider = settings?.ai_provider ?? 'anthropic';
  const classifyModel = settings?.ai_classify_model ?? DEFAULT_MODELS[currentProvider].classify;
  const scoreModel = settings?.ai_score_model ?? DEFAULT_MODELS[currentProvider].score;

  function handleProviderChange(provider: AIProvider) {
    const defaults = DEFAULT_MODELS[provider];
    updateSettings.mutate({
      ai_provider: provider,
      ai_classify_model: defaults.classify,
      ai_score_model: defaults.score,
    });
  }

  // P7: Persist UI preferences to API on change
  function handleThemeChange(t: Theme) {
    setTheme(t);
    updateSettings.mutate({ theme: t });
  }

  function handleDensityChange(d: Density) {
    setDensity(d);
    // density is stored locally only (no API field for it), but we persist it in Zustand
  }

  function handleViewModeChange(m: ViewMode) {
    setViewMode(m);
    updateSettings.mutate({ view_mode: m });
  }

  return (
    <div>
      <div className="mx-auto max-w-xl space-y-8 p-6">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
          <p className="text-sm text-zinc-500">
            Customize your EverPrompt experience.
          </p>
        </div>

        {/* Theme */}
        <SettingSection
          title="Theme"
          description="Choose between dark and light mode."
        >
          <div className="flex gap-2">
            <ToggleOption
              active={theme === 'dark'}
              onClick={() => handleThemeChange('dark')}
              icon={Moon}
              label="Dark"
            />
            <ToggleOption
              active={theme === 'light'}
              onClick={() => handleThemeChange('light')}
              icon={Sun}
              label="Light"
            />
          </div>
        </SettingSection>

        {/* Density */}
        <SettingSection
          title="Density"
          description="Control the spacing and padding of the interface."
        >
          <div className="flex gap-2">
            <ToggleOption
              active={density === 'compact'}
              onClick={() => handleDensityChange('compact')}
              icon={Minimize2}
              label="Compact"
            />
            <ToggleOption
              active={density === 'comfortable'}
              onClick={() => handleDensityChange('comfortable')}
              icon={Maximize2}
              label="Comfortable"
            />
          </div>
        </SettingSection>

        {/* Default view mode */}
        <SettingSection
          title="Default View Mode"
          description="Choose how prompts are displayed by default."
        >
          <div className="flex gap-2">
            <ToggleOption
              active={viewMode === 'grid'}
              onClick={() => handleViewModeChange('grid')}
              icon={LayoutGrid}
              label="Grid"
            />
            <ToggleOption
              active={viewMode === 'list'}
              onClick={() => handleViewModeChange('list')}
              icon={List}
              label="List"
            />
          </div>
        </SettingSection>

        {/* AI Provider */}
        <SettingSection
          title="AI Provider"
          description="Select which LLM provider to use for prompt analysis and scoring."
        >
          <div className="flex flex-wrap gap-2">
            {AI_PROVIDERS.map((p) => (
              <ToggleOption
                key={p.id}
                active={currentProvider === p.id}
                onClick={() => handleProviderChange(p.id)}
                icon={p.icon}
                label={p.label}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2 rounded-lg bg-zinc-800/50 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Classify model</span>
              <code className="rounded bg-zinc-900 px-2 py-0.5 text-zinc-300">
                {classifyModel}
              </code>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Score model</span>
              <code className="rounded bg-zinc-900 px-2 py-0.5 text-zinc-300">
                {scoreModel}
              </code>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            API keys are configured server-side in environment variables.
          </p>
        </SettingSection>

        {/* Data Retention / Auto-Prune */}
        <DataRetentionSection />

        {/* Security Patterns */}
        <SecurityPatternsSection />
      </div>
    </div>
  );
}

// --- Prune types & hooks ---

interface PrunePreviewPrompt {
  id: string;
  title: string;
  created_at: string;
}

interface PrunePreviewData {
  pruned_count: number;
  protected_count: number;
  prompts: PrunePreviewPrompt[];
}

interface PruneRunData {
  pruned_count: number;
  protected_count: number;
}

function usePrunePreview() {
  return useMutation({
    mutationFn: () => api.get<PrunePreviewData>('/prune/preview'),
  });
}

function usePruneRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<PruneRunData>('/prune/run'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

const QUICK_DAYS = [30, 90, 180, 365] as const;

function DataRetentionSection() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: allTags } = useTags();
  const prunePreview = usePrunePreview();
  const pruneRun = usePruneRun();

  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pruneEnabled = settings?.prune_enabled ?? false;
  const pruneAfterDays = settings?.prune_after_days ?? 180;
  const protectedTagIds = settings?.prune_protected_tag_ids ?? [];

  function handleTogglePrune() {
    updateSettings.mutate({ prune_enabled: !pruneEnabled });
  }

  function handleDaysChange(days: number) {
    const clamped = Math.max(7, Math.min(3650, days));
    updateSettings.mutate({ prune_after_days: clamped });
  }

  function handleAddProtectedTag(tagId: string) {
    if (!protectedTagIds.includes(tagId)) {
      updateSettings.mutate({ prune_protected_tag_ids: [...protectedTagIds, tagId] });
    }
  }

  function handleRemoveProtectedTag(tagId: string) {
    updateSettings.mutate({ prune_protected_tag_ids: protectedTagIds.filter((id) => id !== tagId) });
  }

  function handlePreview() {
    prunePreview.mutate(undefined, {
      onSuccess: () => setShowPreview(true),
    });
  }

  function handleRunPrune() {
    pruneRun.mutate(undefined, {
      onSuccess: () => {
        setShowConfirm(false);
        setShowPreview(false);
      },
    });
  }

  const tagList = (allTags ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color ?? null,
  }));

  return (
    <SettingSection
      title="Data Retention"
      description="Automatically delete old prompts to keep your library lean."
    >
      {/* Enable toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-200">Enable auto-prune</span>
        </div>
        <button
          onClick={handleTogglePrune}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
            pruneEnabled ? 'bg-indigo-600' : 'bg-zinc-700',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
              pruneEnabled ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      {/* Days input */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs text-zinc-400">Delete prompts older than</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={7}
            max={3650}
            value={pruneAfterDays}
            onChange={(e) => handleDaysChange(parseInt(e.target.value, 10) || 180)}
            className="w-24 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          />
          <span className="text-sm text-zinc-400">days</span>
        </div>
        <div className="mt-2 flex gap-2">
          {QUICK_DAYS.map((d) => (
            <button
              key={d}
              onClick={() => handleDaysChange(d)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                pruneAfterDays === d
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300',
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Protected tags */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs text-zinc-400">Never delete prompts with these tags</label>
        <TagAutosuggest
          allTags={tagList}
          selectedTagIds={protectedTagIds}
          onAdd={handleAddProtectedTag}
          onRemove={handleRemoveProtectedTag}
          placeholder="Search tags to protect..."
        />
      </div>

      {/* Info note */}
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-zinc-800/30 p-3 text-xs text-zinc-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Favorited and pinned prompts are always protected from auto-deletion.</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handlePreview}
          disabled={prunePreview.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-300 disabled:opacity-50"
        >
          <Eye className="h-3.5 w-3.5" />
          {prunePreview.isPending ? 'Loading...' : 'Preview Prune'}
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:border-red-500/50 hover:bg-red-500/20"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Run Prune Now
        </button>
      </div>

      {/* Preview dialog */}
      {showPreview && prunePreview.data && (
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">Prune Preview</h3>
            <button onClick={() => setShowPreview(false)} className="text-zinc-500 hover:text-zinc-300">
              <span className="text-xs">Close</span>
            </button>
          </div>
          <div className="mb-3 flex gap-4 text-xs">
            <span className="text-red-400">
              {prunePreview.data.pruned_count} prompt{prunePreview.data.pruned_count !== 1 ? 's' : ''} to delete
            </span>
            <span className="text-green-400">
              {prunePreview.data.protected_count} protected
            </span>
          </div>
          {prunePreview.data.prompts.length > 0 ? (
            <div className="max-h-48 overflow-auto space-y-1">
              {prunePreview.data.prompts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded bg-zinc-900/50 px-2.5 py-1.5 text-xs">
                  <span className="truncate text-zinc-300">{p.title || '(untitled)'}</span>
                  <span className="shrink-0 text-zinc-600 ml-2">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No prompts match the prune criteria.</p>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <p className="mb-3 text-sm text-red-300">
            Are you sure you want to run prune now? This will soft-delete all matching prompts.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRunPrune}
              disabled={pruneRun.isPending}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {pruneRun.isPending ? 'Pruning...' : 'Confirm Delete'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
          {pruneRun.isSuccess && (
            <p className="mt-2 text-xs text-green-400">
              Done! Pruned {pruneRun.data.pruned_count} prompt{pruneRun.data.pruned_count !== 1 ? 's' : ''}, {pruneRun.data.protected_count} protected.
            </p>
          )}
        </div>
      )}
    </SettingSection>
  );
}

function SecurityPatternsSection() {
  const { data: patterns, isLoading } = useSecurityPatterns();
  const addPattern = useAddPattern();
  const deletePattern = useDeletePattern();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CustomPatternDef>({
    pattern: '',
    flags: 'gi',
    type: 'api_key',
    severity: 'high',
    description: '',
  });

  function handleAdd() {
    if (!form.pattern || !form.description) return;
    addPattern.mutate(form, {
      onSuccess: () => {
        setForm({ pattern: '', flags: 'gi', type: 'api_key', severity: 'high', description: '' });
        setShowForm(false);
      },
    });
  }

  return (
    <SettingSection
      title="Security Patterns"
      description="Add custom regex patterns to detect organization-specific secrets and sensitive data."
    >
      <p className="mb-4 text-xs text-zinc-500">
        Built-in patterns detect 60+ common secret types automatically. Add custom patterns for your organization's specific secrets.
      </p>

      {/* Pattern list */}
      {isLoading ? (
        <p className="text-xs text-zinc-500">Loading...</p>
      ) : patterns && patterns.length > 0 ? (
        <div className="space-y-2 mb-4">
          {patterns.map((p, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 rounded-lg bg-zinc-800/50 p-3"
            >
              <div className="min-w-0 flex-1">
                <code className="block truncate text-xs text-zinc-300">{p.pattern}</code>
                <div className="mt-1 flex items-center gap-2">
                  <span className={cn(
                    'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
                    p.severity === 'critical' && 'bg-red-500/20 text-red-400',
                    p.severity === 'high' && 'bg-orange-500/20 text-orange-400',
                    p.severity === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                    p.severity === 'low' && 'bg-blue-500/20 text-blue-400',
                  )}>
                    {p.severity}
                  </span>
                  <span className="text-[10px] text-zinc-500">{p.type}</span>
                  <span className="truncate text-[10px] text-zinc-400">{p.description}</span>
                </div>
              </div>
              <button
                onClick={() => deletePattern.mutate(i)}
                className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
                title="Delete pattern"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-zinc-800/30 p-3 text-xs text-zinc-500">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          No custom patterns configured. Only built-in patterns are active.
        </div>
      )}

      {/* Add pattern form */}
      {showForm ? (
        <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Regex Pattern</label>
            <input
              type="text"
              value={form.pattern}
              onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              placeholder="e.g. my-corp-key-[a-z0-9]{32}"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CustomPatternDef['type'] })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
              >
                {PATTERN_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as CustomPatternDef['severity'] })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
              >
                {SEVERITY_LEVELS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Flags</label>
              <input
                type="text"
                value={form.flags ?? ''}
                onChange={(e) => setForm({ ...form, flags: e.target.value })}
                placeholder="gi"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. MyCorp internal API key"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!form.pattern || !form.description || addPattern.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {addPattern.isPending ? 'Adding...' : 'Add Pattern'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-300"
        >
          <Plus className="h-4 w-4" />
          Add Pattern
        </button>
      )}
    </SettingSection>
  );
}

function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-sm font-semibold text-zinc-200 mb-1">{title}</h2>
      <p className="text-xs text-zinc-500 mb-4">{description}</p>
      {children}
    </div>
  );
}

function ToggleOption({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-all duration-150',
        active
          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{label}</span>
    </button>
  );
}
