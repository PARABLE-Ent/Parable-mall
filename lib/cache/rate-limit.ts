import { redis } from './redis';

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * IP 기반 Rate Limiting (Upstash Redis 슬라이딩 윈도우)
 * @param identifier - IP 주소 또는 고유 식별자
 * @param maxAttempts - 허용 최대 시도 횟수
 * @param windowSeconds - 윈도우 크기(초)
 */
export async function rateLimit(
  identifier: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `rate-limit:${identifier}`;

  const current = await redis.get<number>(key);
  const count = current ?? 0;

  if (count >= maxAttempts) {
    const ttl = await redis.ttl(key);
    return {
      success: false,
      remaining: 0,
      resetInSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  }

  // 첫 시도인 경우 TTL 설정, 이후에는 증가만
  if (count === 0) {
    await redis.set(key, 1, { ex: windowSeconds });
  } else {
    await redis.incr(key);
  }

  return {
    success: true,
    remaining: maxAttempts - count - 1,
    resetInSeconds: windowSeconds,
  };
}

/**
 * 로그인 Rate Limiting: IP당 5회/15분
 */
export async function loginRateLimit(ip: string): Promise<RateLimitResult> {
  return rateLimit(`login:${ip}`, 5, 15 * 60);
}
