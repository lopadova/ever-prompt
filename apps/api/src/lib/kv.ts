const DEFAULT_TTL = 300; // 5 minutes

export async function kvGet<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const val = await kv.get(key, 'json');
  return val as T | null;
}

export async function kvSet(kv: KVNamespace, key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
}

export async function kvInvalidate(kv: KVNamespace, ...keys: string[]): Promise<void> {
  await Promise.all(keys.map(k => kv.delete(k)));
}
