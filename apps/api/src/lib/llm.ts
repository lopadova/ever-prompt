import Anthropic from '@anthropic-ai/sdk';
import { kvGet } from './kv';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LLMProviderType = 'anthropic' | 'openai' | 'openrouter' | 'workers-ai';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMOptions {
  messages: LLMMessage[];
  maxTokens: number;
  model?: string;
}

export interface LLMProvider {
  chat(options: LLMOptions): Promise<string>;
}

export interface LLMConfig {
  provider: LLMProviderType;
  classifyModel: string;
  scoreModel: string;
  // API keys
  anthropicKey?: string;
  openaiKey?: string;
  openrouterKey?: string;
  // Workers AI binding
  ai?: Ai;
}

// ---------------------------------------------------------------------------
// Default models per provider
// ---------------------------------------------------------------------------

export const DEFAULT_MODELS: Record<LLMProviderType, { classify: string; score: string }> = {
  anthropic: { classify: 'claude-haiku-4-5-20251001', score: 'claude-sonnet-4-20250514' },
  openai: { classify: 'gpt-4o-mini', score: 'gpt-4o' },
  openrouter: { classify: 'anthropic/claude-3.5-haiku', score: 'anthropic/claude-sonnet-4' },
  'workers-ai': { classify: '@cf/meta/llama-3.1-8b-instruct', score: '@cf/meta/llama-3.1-70b-instruct' },
};

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(options: LLMOptions): Promise<string> {
    // Anthropic separates the system message from the conversation messages.
    let systemText: string | undefined;
    const conversationMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    for (const msg of options.messages) {
      if (msg.role === 'system') {
        systemText = msg.content;
      } else {
        conversationMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await this.client.messages.create({
      model: options.model ?? 'claude-haiku-4-5-20251001',
      max_tokens: options.maxTokens,
      ...(systemText ? { system: systemText } : {}),
      messages: conversationMessages,
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  }
}

class OpenAIProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(options: LLMOptions): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model ?? 'gpt-4o-mini',
        max_tokens: options.maxTokens,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };

    return json.choices[0]?.message?.content ?? '';
  }
}

class OpenRouterProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(options: LLMOptions): Promise<string> {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://everprompt.app',
      },
      body: JSON.stringify({
        model: options.model ?? 'anthropic/claude-3.5-haiku',
        max_tokens: options.maxTokens,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };

    return json.choices[0]?.message?.content ?? '';
  }
}

class WorkersAIProvider implements LLMProvider {
  private ai: Ai;

  constructor(ai: Ai) {
    this.ai = ai;
  }

  async chat(options: LLMOptions): Promise<string> {
    const model = (options.model ?? '@cf/meta/llama-3.1-8b-instruct') as Parameters<Ai['run']>[0];

    const result = await this.ai.run(model, {
      messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options.maxTokens,
    });

    // Workers AI text-generation returns { response?: string }
    if (typeof result === 'object' && result !== null && 'response' in result) {
      return (result as { response: string }).response ?? '';
    }
    return '';
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'anthropic': {
      if (!config.anthropicKey) throw new Error('Missing CLAUDE_API_KEY for Anthropic provider');
      return new AnthropicProvider(config.anthropicKey);
    }
    case 'openai': {
      if (!config.openaiKey) throw new Error('Missing OPENAI_API_KEY for OpenAI provider');
      return new OpenAIProvider(config.openaiKey);
    }
    case 'openrouter': {
      if (!config.openrouterKey) throw new Error('Missing OPENROUTER_API_KEY for OpenRouter provider');
      return new OpenRouterProvider(config.openrouterKey);
    }
    case 'workers-ai': {
      if (!config.ai) throw new Error('Missing AI binding for Workers AI provider');
      return new WorkersAIProvider(config.ai);
    }
    default:
      throw new Error(`Unknown LLM provider: ${config.provider as string}`);
  }
}

// ---------------------------------------------------------------------------
// Helper: build LLMConfig from KV settings + environment
// ---------------------------------------------------------------------------

interface LLMEnv {
  CLAUDE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  AI?: Ai;
}

interface StoredAIConfig {
  ai_provider?: LLMProviderType;
  ai_classify_model?: string;
  ai_score_model?: string;
}

export async function getLLMConfig(kv: KVNamespace, env: LLMEnv): Promise<LLMConfig> {
  // Check if user stored AI settings in KV
  const stored = await kvGet<StoredAIConfig>(kv, 'user:settings');

  const provider: LLMProviderType = stored?.ai_provider ?? 'anthropic';
  const defaults = DEFAULT_MODELS[provider];

  return {
    provider,
    classifyModel: stored?.ai_classify_model ?? defaults.classify,
    scoreModel: stored?.ai_score_model ?? defaults.score,
    anthropicKey: env.CLAUDE_API_KEY,
    openaiKey: env.OPENAI_API_KEY,
    openrouterKey: env.OPENROUTER_API_KEY,
    ai: env.AI,
  };
}
