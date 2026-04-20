/**
 * 관리자 API 호출용 fetch 래퍼 (클라이언트).
 *
 * - mutation 요청(POST/PATCH/PUT/DELETE) 에 `admin_csrf` 쿠키 값을 `X-CSRF-Token` 헤더로 자동 첨부.
 * - 서버의 `requireAdminApi` 와 쌍으로 동작한다.
 * - 세션 만료(401) 시 관리자 로그인 페이지로 리디렉션한다.
 */

'use client';

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)admin_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (MUTATION_METHODS.has(method)) {
    const token = readCsrfCookie();
    if (token && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', token);
    }
  }

  if (init.body && !headers.has('Content-Type') && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(input, { ...init, headers, credentials: 'include' });
  if (res.status === 401 && typeof window !== 'undefined') {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/admin/login?redirect=${redirect}`;
  }
  return res;
}

export async function adminFetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const res = await adminFetch(input, init);
  if (!res.ok) {
    let message = '요청 처리에 실패했습니다.';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}
