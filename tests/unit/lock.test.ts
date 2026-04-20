import { beforeEach, describe, expect, it, vi } from 'vitest';

// Redis 를 in-memory 로 모킹: acquireLock/releaseLock 의 동작을 결정론적으로 검증
vi.mock('@/lib/cache/redis', () => {
  const store = new Map<string, string>();
  return {
    redis: {
      async set(key: string, value: string, opts?: { nx?: boolean; ex?: number }) {
        if (opts?.nx && store.has(key)) return null;
        store.set(key, value);
        return 'OK';
      },
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async del(key: string) {
        const existed = store.delete(key);
        return existed ? 1 : 0;
      },
      async eval(_script: string, keys: string[], args: string[]) {
        const [key] = keys;
        const [token] = args;
        if (store.get(key) === token) {
          store.delete(key);
          return 1;
        }
        return 0;
      },
      __store: store,
    },
  };
});

describe('withLock 동시성', () => {
  beforeEach(async () => {
    const mod = (await import('@/lib/cache/redis')) as unknown as {
      redis: { __store: Map<string, string> };
    };
    mod.redis.__store.clear();
  });

  it('락 획득 후 fn 실행 → 자동 해제', async () => {
    const { withLock } = await import('@/lib/cache/lock');
    const { redis } = (await import('@/lib/cache/redis')) as unknown as {
      redis: { __store: Map<string, string> };
    };

    const result = await withLock('test-key', async () => 'OK');
    expect(result).toBe('OK');
    expect(redis.__store.has('lock:test-key')).toBe(false);
  });

  it('fn 예외 시에도 락 해제', async () => {
    const { withLock } = await import('@/lib/cache/lock');
    const { redis } = (await import('@/lib/cache/redis')) as unknown as {
      redis: { __store: Map<string, string> };
    };

    await expect(
      withLock('test-err', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(redis.__store.has('lock:test-err')).toBe(false);
  });

  it('동시 두 요청 중 하나는 대기 후 성공', async () => {
    const { withLock } = await import('@/lib/cache/lock');

    const order: string[] = [];
    const first = withLock('busy', async () => {
      order.push('first-start');
      await new Promise((r) => setTimeout(r, 40));
      order.push('first-end');
      return 1;
    });
    // 약간 지연시켜 두 번째가 확실히 충돌하도록
    await new Promise((r) => setTimeout(r, 5));
    const second = withLock(
      'busy',
      async () => {
        order.push('second-start');
        return 2;
      },
      { maxRetries: 10, backoffBaseMs: 10 },
    );

    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(1);
    expect(b).toBe(2);
    // 두 번째는 첫 번째 종료 이후에 실행됨
    expect(order).toEqual(['first-start', 'first-end', 'second-start']);
  });
});
