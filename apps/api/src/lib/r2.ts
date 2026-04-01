export async function r2Put(r2: R2Bucket, key: string, data: ArrayBuffer | string, contentType?: string): Promise<R2Object> {
  const httpMetadata = contentType ? { contentType } : undefined;
  return r2.put(key, data, { httpMetadata });
}

export async function r2Get(r2: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return r2.get(key);
}

export async function r2Delete(r2: R2Bucket, key: string): Promise<void> {
  await r2.delete(key);
}

export async function r2List(r2: R2Bucket, prefix: string, limit = 100): Promise<R2Objects> {
  return r2.list({ prefix, limit });
}
