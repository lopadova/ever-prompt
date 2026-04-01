export async function embedText(ai: Ai, text: string): Promise<number[]> {
  const result = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [text] }) as { data: number[][] };
  return result.data[0];
}

export async function upsertVector(
  vectorize: VectorizeIndex,
  id: string,
  values: number[],
  metadata: Record<string, string | number | boolean>
): Promise<void> {
  await vectorize.upsert([{ id, values, metadata }]);
}

export async function queryVectors(
  vectorize: VectorizeIndex,
  values: number[],
  topK: number,
  filter?: VectorizeVectorMetadataFilter
): Promise<VectorizeMatches> {
  return vectorize.query(values, { topK, filter, returnMetadata: 'all' });
}

export async function deleteVector(vectorize: VectorizeIndex, id: string): Promise<void> {
  await vectorize.deleteByIds([id]);
}
