import { redis } from './redis';

// 기본 TTL: 짧게 유지하여 장애 시 자동 해제. 길게 필요한 작업은 명시적 ttl 전달.
const DEFAULT_LOCK_TTL = 10; // seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_BASE_MS = 50;

// 각 프로세스/요청 별로 고유한 토큰을 사용해, 자기 것이 아닌 락을 삭제하지 않도록 보장한다.
function createToken(): string {
  // Upstash Redis는 Edge/Node 모두에서 동작해야 하므로 crypto.randomUUID() 사용
  return crypto.randomUUID();
}

/**
 * Redis SET key value NX EX ttl 로 락 획득. 성공 시 토큰 반환, 실패 시 null.
 */
export async function acquireLock(key: string, ttl = DEFAULT_LOCK_TTL): Promise<string | null> {
  const token = createToken();
  const result = await redis.set(`lock:${key}`, token, { nx: true, ex: ttl });
  return result === 'OK' ? token : null;
}

/**
 * 토큰이 일치하는 경우에만 락을 해제한다 (Lua script 기반 원자적 CAS 해제).
 * 타임아웃 후 다른 요청이 동일 키를 선점한 경우 실수로 그 락을 지우는 것을 방지한다.
 */
export async function releaseLock(key: string, token: string): Promise<void> {
  // Upstash REST의 eval API를 사용
  const script = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    else
      return 0
    end
  `;
  try {
    // @upstash/redis 는 eval(script, keys, args) 시그니처를 지원한다.
    await redis.eval(script, [`lock:${key}`], [token]);
  } catch {
    // eval 이 불가능한 환경이라면 최선의 보장: 일반 del 은 사용하지 않음 (안전성 우선).
    // 락 TTL 이후 자동 만료를 기다린다.
  }
}

/**
 * 락을 획득할 때까지 exponential backoff 으로 재시도한다. 반환값은 작업 결과.
 * - 락 획득 실패(maxRetries 초과) 시 `LockAcquisitionError` 를 던진다.
 * - fn 실행 중 예외가 발생해도 락은 반드시 해제된다.
 */
export class LockAcquisitionError extends Error {
  constructor(public readonly key: string) {
    super('다른 요청이 처리 중입니다. 잠시 후 다시 시도해주세요.');
    this.name = 'LockAcquisitionError';
  }
}

export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: {
    ttl?: number;
    maxRetries?: number;
    backoffBaseMs?: number;
  } = {},
): Promise<T> {
  const ttl = options.ttl ?? DEFAULT_LOCK_TTL;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const backoff = options.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const token = await acquireLock(key, ttl);
    if (token) {
      try {
        return await fn();
      } finally {
        await releaseLock(key, token);
      }
    }
    if (attempt < maxRetries) {
      // 50ms, 100ms, 200ms ... 지수 백오프 + 약간의 jitter
      const delay = backoff * Math.pow(2, attempt) + Math.floor(Math.random() * 25);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new LockAcquisitionError(key);
}
