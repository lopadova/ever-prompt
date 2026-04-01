export type Env = {
  Bindings: {
    DB: D1Database;
    VECTORIZE: VectorizeIndex;
    R2: R2Bucket;
    KV: KVNamespace;
    AI_QUEUE: Queue;
    AI: Ai;
    ASSETS: Fetcher;
    CLAUDE_API_KEY: string;
    OPENAI_API_KEY: string;
    OPENROUTER_API_KEY: string;
    ENVIRONMENT: string;
  };
  Variables: {
    authType: 'zero_trust' | 'api_key' | 'dev';
    apiKeyId?: string;
    permissions?: string[];
  };
};
