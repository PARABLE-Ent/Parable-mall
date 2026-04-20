import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { passwordResetRateLimit } from '@/lib/cache/rate-limit';
import { logger } from '@/lib/logger';
import { requestPasswordReset, requestResetSchema } from '@/server/auth/password-reset';

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await passwordResetRateLimit(ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestResetSchema.safeParse(body);
  if (!parsed.success) {
    // 검증 실패여도 success 응답 — 열거 방지
    return NextResponse.json({ success: true });
  }

  try {
    await requestPasswordReset(parsed.data.email);
  } catch (err) {
    logger.error('password_reset.request_failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return NextResponse.json({ success: true });
}
