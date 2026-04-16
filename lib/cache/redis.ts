import { Redis } from '@upstash/redis';

let _redis: Redis | undefined;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables',
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}

// 하위 호환: 기존 코드에서 redis를 직접 import 하는 경우를 위한 Proxy
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const instance = getRedis();
    const value = instance[prop as keyof Redis];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});
