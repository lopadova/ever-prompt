import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../env';
import { db } from '../lib/db';
import { prompts, promptAiReviews } from '@everprompt/db';
import { claude, scorePrompt } from '../lib/claude';
import { embedText, queryVectors } from '../lib/vectorize';
import { paginationMeta, paginationOffset } from '../lib/pagination';
import { ulid, computeDiff } from '@everprompt/shared';

export const aiRoutes = new Hono<Env>();

// POST /:id/analyze - Trigger/re-trigger full AI pipeline
aiRoutes.post('/:id/analyze', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');

  const [prompt] = await d.select().from(prompts)
    .where(eq(prompts.id, id))
    .limit(1);

  if (!prompt) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Prompt not found' } }, 404);
  }

  // Set status to pending and enqueue
  await d.update(prompts).set({
    ai_status: 'pending',
    updated_at: new Date().toISOString(),
  }).where(eq(prompts.id, id));

  await c.env.AI_QUEUE.send({ promptId: id, action: 'reanalyze' });

  return c.json({ ok: true, data: { id, ai_status: 'pending' } });
});

// POST /:id/improve - Generate new improved version via Sonnet
aiRoutes.post('/:id/improve', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');

  const [prompt] = await d.select().from(prompts)
    .where(eq(prompts.id, id))
    .limit(1);

  if (!prompt) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Prompt not found' } }, 404);
  }

  // Call Sonnet for improvement
  const client = claude(c.env.CLAUDE_API_KEY);
  const tagNames: string[] = []; // Could fetch tags, but body + title + abstract suffice
  const result = await scorePrompt(
    client,
    prompt.body_original,
    prompt.title,
    prompt.abstract,
    tagNames,
    'improvement',
  );

  // Generate diff
  const diffLines = computeDiff(prompt.body_original, result.improved_prompt);
  const diffText = diffLines
    .filter(line => line.type !== 'unchanged')
    .map(line => `${line.type === 'added' ? '+' : '-'} ${line.content}`)
    .join('\n');

  return c.json({
    ok: true,
    data: {
      improved_prompt: result.improved_prompt,
      diff: diffText,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      recommended_actions: result.recommended_actions,
    },
  });
});

// GET /:id/review - Latest AI review
aiRoutes.get('/:id/review', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');

  const [review] = await d.select().from(promptAiReviews)
    .where(eq(promptAiReviews.prompt_id, id))
    .orderBy(desc(promptAiReviews.created_at))
    .limit(1);

  if (!review) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'No review found for this prompt' } }, 404);
  }

  return c.json({
    ok: true,
    data: {
      ...review,
      recommended_actions: JSON.parse(review.recommended_actions),
    },
  });
});

// GET /:id/reviews - Review history
aiRoutes.get('/:id/reviews', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');
  const page = parseInt(c.req.query('page') || '1', 10);
  const perPage = parseInt(c.req.query('per_page') || '10', 10);
  const { limit, offset } = paginationOffset(page, Math.min(perPage, 50));

  const reviews = await d.select().from(promptAiReviews)
    .where(eq(promptAiReviews.prompt_id, id))
    .orderBy(desc(promptAiReviews.created_at))
    .limit(limit)
    .offset(offset);

  // Get total count
  const allReviews = await d.select({ id: promptAiReviews.id }).from(promptAiReviews)
    .where(eq(promptAiReviews.prompt_id, id));
  const total = allReviews.length;

  const data = reviews.map(r => ({
    ...r,
    recommended_actions: JSON.parse(r.recommended_actions),
  }));

  return c.json({
    ok: true,
    data,
    meta: paginationMeta(total, page, perPage),
  });
});

// GET /:id/similar - Similar prompts via Vectorize
aiRoutes.get('/:id/similar', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');

  const [prompt] = await d.select().from(prompts)
    .where(eq(prompts.id, id))
    .limit(1);

  if (!prompt) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Prompt not found' } }, 404);
  }

  // Build embedding text from prompt
  const textToEmbed = `${prompt.title} | ${prompt.abstract} | ${prompt.body_normalized}`;
  const truncated = textToEmbed.slice(0, 2000);

  try {
    const vector = await embedText(c.env.AI, truncated);
    const matches = await queryVectors(c.env.VECTORIZE, vector, 11); // 11 to account for self

    // Filter out self and map to results
    const similarIds = (matches.matches ?? [])
      .filter(m => m.id !== id)
      .slice(0, 10)
      .map(m => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata,
      }));

    // Fetch prompt details for similar prompts
    const similarPrompts = [];
    for (const match of similarIds) {
      const [p] = await d.select().from(prompts)
        .where(eq(prompts.id, match.id as string))
        .limit(1);
      if (p) {
        similarPrompts.push({
          id: p.id,
          title: p.title,
          abstract: p.abstract,
          quality_band: p.quality_band,
          overall_score: p.overall_score,
          similarity_score: match.score,
          created_at: p.created_at,
        });
      }
    }

    return c.json({ ok: true, data: similarPrompts });
  } catch (e) {
    // If vectorize is not available or embedding fails
    return c.json({ ok: true, data: [] });
  }
});
