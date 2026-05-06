import { eq } from 'drizzle-orm';
import { sessions } from '@everprompt/db';
import type { Env } from '../env';
import { runPipeline } from '../ai/pipeline';
import { generateSessionName } from '../ai/classify';
import { getLLMConfig, createLLMProvider } from '../lib/llm';
import { db } from '../lib/db';

interface QueueMessage {
  promptId?: string;
  sessionId?: string;
  promptBody?: string;
  action: 'analyze' | 'reanalyze' | 'embed_only' | 'name_session';
}

export async function queueConsumer(
  batch: MessageBatch<QueueMessage>,
  env: Env['Bindings']
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      if (msg.body.action === 'name_session') {
        await handleNameSession(env, msg.body);
      } else if (msg.body.promptId) {
        await runPipeline(env, msg.body.promptId);
      } else {
        console.error('Queue message missing promptId for action:', msg.body.action);
      }
      msg.ack();
    } catch (e) {
      console.error(`Queue processing error:`, e);
      msg.retry();
    }
  }
}

async function handleNameSession(
  env: Env['Bindings'],
  body: QueueMessage,
): Promise<void> {
  if (!body.sessionId || !body.promptBody) return;

  const d = db(env.DB);

  // Only name sessions that still have the pending name
  const [session] = await d.select().from(sessions)
    .where(eq(sessions.id, body.sessionId))
    .limit(1);

  if (!session || session.name !== 'Session (pending)') return;

  const llmConfig = await getLLMConfig(env.KV, env);
  const llm = createLLMProvider(llmConfig);

  const name = await generateSessionName(llm, llmConfig.classifyModel, body.promptBody);

  await d.update(sessions).set({
    name,
    updated_at: new Date().toISOString(),
  }).where(eq(sessions.id, body.sessionId));
}
