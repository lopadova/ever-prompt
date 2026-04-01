import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PromptForm } from '@/components/prompt/prompt-form';
import { useCreatePrompt } from '@/hooks/use-prompts';
import { toast } from 'sonner';

export function PromptNewPage() {
  const navigate = useNavigate();
  const createPrompt = useCreatePrompt();

  return (
    <div>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Back nav */}
        <button
          onClick={() => navigate('/prompts')}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to prompts
        </button>

        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">New Prompt</h1>
          <p className="text-sm text-zinc-500">
            Create a new prompt. AI analysis will start automatically.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <PromptForm
            onSubmit={(data) => {
              createPrompt.mutate(data, {
                onSuccess: (result) => {
                  toast.success('Prompt created successfully');
                  navigate(`/prompts/${result.id}`);
                },
                onError: (err) => {
                  toast.error(`Failed to create prompt: ${err.message}`);
                },
              });
            }}
            loading={createPrompt.isPending}
          />
        </div>
      </div>
    </div>
  );
}
