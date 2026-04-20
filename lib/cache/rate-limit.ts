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

/**
 * 결제 확인 API Rate Limiting: 사용자 + IP당 10회/분
 */
export async function paymentRateLimit(userId: string, ip: string): Promise<RateLimitResult> {
  return rateLimit(`payment:${userId}:${ip}`, 10, 60);
}

/**
 * 주문 생성 Rate Limiting: 사용자당 10회/분
 */
export async function orderRateLimit(userId: string): Promise<RateLimitResult> {
  return rateLimit(`order:${userId}`, 10, 60);
}

/**
 * 비밀번호 재설정 Rate Limiting: 이메일당 3회/30분
 */
export async function passwordResetRateLimit(email: string): Promise<RateLimitResult> {
  return rateLimit(`pwdreset:${email}`, 3, 30 * 60);
}

/**
 * 공용 API 용 Rate Limiting: IP당 100회/분 (기본값)
 */
export async function apiRateLimit(
  ip: string,
  max = 100,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  return rateLimit(`api:${ip}`, max, windowSeconds);
}

/**
 * Idempotency 캐시 helper — 동일 키로 호출된 경우 기존 응답을 반환.
 */
const IDEMPOTENT_TTL = 24 * 60 * 60; // 24시간
const IDEMPOTENT_PREFIX = 'idem:';

export async function getIdempotentResult<T>(key: string): Promise<T | null> {
  const raw = await redis.get<string>(`${IDEMPOTENT_PREFIX}${key}`);
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T);
  } catch {
    return null;
  }
}

export async function setIdempotentResult(key: string, result: unknown): Promise<void> {
  await redis.set(`${IDEMPOTENT_PREFIX}${key}`, JSON.stringify(result), {
    ex: IDEMPOTENT_TTL,
  });
}
