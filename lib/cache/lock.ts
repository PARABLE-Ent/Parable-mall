import { redis } from './redis';

const LOCK_TTL = 10; // 10초

export async function acquireLock(key: string, ttl = LOCK_TTL): Promise<boolean> {
  // Upstash Redis: set with NX and EX options
  const result = await redis.set(`lock:${key}`, '1', { nx: true, ex: ttl });
  return result === 'OK';
}

export async function releaseLock(key: string): Promise<void> {
  await redis.del(`lock:${key}`);
}

export async function withLock<T>(key: string, fn: () => Promise<T>, ttl = LOCK_TTL): Promise<T> {
  const acquired = await acquireLock(key, ttl);
  if (!acquired) {
    throw new Error('다른 요청이 처리 중입니다. 잠시 후 다시 시도해주세요.');
  }
  try {
    return await fn();
  } finally {
    await releaseLock(key);
  }
}
