import { describe, expect, it, vi, beforeEach } from 'vitest';

// idempotent get/set 이 캐시 hit 시 동일 응답을 재사용하는지 검증한다.
vi.mock('@/lib/cache/redis', () => {
  const store = new Map<string, string>();
  return {
    redis: {
      async set(key: string, value: string, opts?: { ex?: number; nx?: boolean }) {
        if (opts?.nx && store.has(key)) return null;
        store.set(key, value);
        return 'OK';
      },
      async get<T>(key: string) {
        return (store.get(key) ?? null) as T | null;
      },
      async del(key: string) {
        return store.delete(key) ? 1 : 0;
      },
      __store: store,
    },
  };
});

describe('멱등 캐시 (Idempotency)', () => {
  beforeEach(async () => {
    const mod = (await import('@/lib/cache/redis')) as unknown as {
      redis: { __store: Map<string, string> };
    };
    mod.redis.__store.clear();
  });

  it('set 후 같은 키로 get 하면 동일한 결과 반환', async () => {
    const { setIdempotentResult, getIdempotentResult } = await import('@/lib/cache/rate-limit');
    const key = 'toss:user-1:req-abc';
    await setIdempotentResult(key, { success: true, orderNumber: 'ORD-1' });
    const cached = await getIdempotentResult<{ success: boolean; orderNumber: string }>(key);
    expect(cached).toEqual({ success: true, orderNumber: 'ORD-1' });
  });

  it('미스 시 null 반환', async () => {
    const { getIdempotentResult } = await import('@/lib/cache/rate-limit');
    const cached = await getIdempotentResult('not-exist');
    expect(cached).toBeNull();
  });
});
