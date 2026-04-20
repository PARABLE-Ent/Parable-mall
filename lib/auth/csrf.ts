/**
 * 관리자 mutation API 용 CSRF 보호.
 *
 * 전략 (double-submit cookie):
 * 1) 로그인/세션 초기화 시 안전한 랜덤 토큰을 생성하여
 *    (a) httpOnly=false, sameSite=Strict 쿠키 `admin_csrf` 로 발급
 *    (b) Redis 에도 `admin:csrf:<sessionId>` 로 저장 (TTL = 세션 TTL)
 * 2) 브라우저가 mutation 요청 시 `X-CSRF-Token` 헤더로 쿠키 값을 되보낸다.
 * 3) 서버는 헤더 ↔ 쿠키 ↔ Redis 세 값이 모두 일치하는지 검증한다.
 *
 * 크로스 사이트 공격자는 쿠키를 읽을 수 없으므로 헤더를 맞출 수 없고,
 * 서버측 저장소 확인으로 토큰 탈취 재사용도 제한한다.
 */

import { cookies } from 'next/headers';

import { redis } from '@/lib/cache/redis';

export const CSRF_COOKIE = 'admin_csrf';
export const CSRF_HEADER = 'x-csrf-token';
const CSRF_REDIS_PREFIX = 'admin:csrf:';

function generateToken(): string {
  // 32 bytes → base64url 암호학적 토큰
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

export async function issueAdminCsrfToken(sessionId: string, ttlSeconds: number): Promise<string> {
  const token = generateToken();
  await redis.set(`${CSRF_REDIS_PREFIX}${sessionId}`, token, { ex: ttlSeconds });
  const store = await cookies();
  store.set(CSRF_COOKIE, token, {
    httpOnly: false, // JS 가 읽고 헤더로 되돌려 보내야 함
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: ttlSeconds,
    path: '/',
  });
  return token;
}

export async function revokeAdminCsrfToken(sessionId: string): Promise<void> {
  await redis.del(`${CSRF_REDIS_PREFIX}${sessionId}`);
  const store = await cookies();
  store.delete(CSRF_COOKIE);
}

export async function validateCsrf(request: Request, sessionId: string): Promise<boolean> {
  const header = request.headers.get(CSRF_HEADER);
  if (!header) return false;
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  if (!cookieToken || cookieToken !== header) return false;
  const storedToken = await redis.get<string>(`${CSRF_REDIS_PREFIX}${sessionId}`);
  if (!storedToken) return false;
  return storedToken === cookieToken;
}

/**
 * GET/HEAD/OPTIONS 는 검증 생략. mutation 메서드만 CSRF 검증 필요.
 */
export function requiresCsrf(method: string): boolean {
  const upper = method.toUpperCase();
  return upper !== 'GET' && upper !== 'HEAD' && upper !== 'OPTIONS';
}
