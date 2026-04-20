/**
 * 관리자 API 전용 가드 헬퍼.
 *
 * - Redis 세션을 직접 확인 (getAdminSession 은 redirect 하지 않음).
 * - mutation (POST/PATCH/PUT/DELETE) 요청은 CSRF 토큰을 검증.
 * - 응답은 NextResponse 로 표준화 — 로그인/권한/CSRF 실패에 각각 다른 상태코드 반환.
 * - 호출자는 세션과 요청을 받아 추가 로직을 수행한다.
 */

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { redis } from '@/lib/cache/redis';
import { requiresCsrf, validateCsrf } from '@/lib/auth/csrf';

import type { AdminRole, AdminSession } from './types';

const ADMIN_SESSION_PREFIX = 'admin:session:';

async function loadSession(): Promise<{ session: AdminSession; sessionId: string } | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('admin_session')?.value;
  if (!sessionId) return null;
  const data = await redis.get<string>(`${ADMIN_SESSION_PREFIX}${sessionId}`);
  if (!data) return null;
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return { session: parsed as AdminSession, sessionId };
  } catch {
    return null;
  }
}

export interface AdminApiContext {
  session: AdminSession;
  sessionId: string;
  ip: string | null;
}

export async function requireAdminApi(
  request: Request,
  options: {
    roles?: AdminRole[];
    allowWithoutCsrf?: boolean;
  } = {},
): Promise<AdminApiContext | NextResponse> {
  const loaded = await loadSession();
  if (!loaded) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  const { session, sessionId } = loaded;

  if (options.roles && !options.roles.includes(session.adminUser.role)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  if (!options.allowWithoutCsrf && requiresCsrf(request.method)) {
    const ok = await validateCsrf(request, sessionId);
    if (!ok) {
      return NextResponse.json({ error: 'CSRF 토큰이 유효하지 않습니다.' }, { status: 403 });
    }
  }

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  return { session, sessionId, ip };
}
