import { embedText, upsertVector } from '../lib/vectorize';
import { sha256 } from '@everprompt/shared';
import type { QualityBand } from '@everprompt/shared';

export interface EmbedInput {
  promptId: string;
  title: string;
  abstract: string;
  body_normalized: string;
  project_id: string | null;
  category_id: string | null;
  quality_band: QualityBand;
  status: string;
  language: string;
  is_favorite: boolean;
  ai: Ai;
  vectorize: VectorizeIndex;
  db: D1Database;
}

export async function embed(input: EmbedInput): Promise<void> {
  // Build the text to embed: title | abstract | body_normalized (truncated)
  const textToEmbed = `${input.title} | ${input.abstract} | ${input.body_normalized}`;
  const truncated = textToEmbed.slice(0, 2000); // Rough token limit (~512 tokens)

  // Generate embedding via Workers AI
  const vector = await embedText(input.ai, truncated);

  // Upsert to Vectorize with metadata
  await upsertVector(input.vectorize, input.promptId, vector, {
    project_id: input.project_id || '',
    category_id: input.category_id || '',
    quality_band: input.quality_band,
    status: input.status,
    language: input.language,
    is_favorite: input.is_favorite ? 1 : 0,
  });

  // Save prompt_embeddings record in D1
  const embeddedTextHash = await sha256(truncated);
  const now = new Date().toISOString();

  await input.db.prepare(
    `INSERT OR REPLACE INTO prompt_embeddings (prompt_id, vector_id, embedding_model, embedded_text_hash, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    input.promptId,
    input.promptId, // vector_id is the same as prompt_id since we upsert by prompt id
    '@cf/baai/bge-base-en-v1.5',
    embeddedTextHash,
    now,
  ).run();
}
