import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { adminLogin } from '@/lib/auth/admin';
import { loginRateLimit } from '@/lib/cache/rate-limit';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  // Rate Limiting: IP당 5회/15분
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateLimitResult = await loginRateLimit(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: `로그인 시도가 너무 많습니다. ${Math.ceil(rateLimitResult.resetInSeconds / 60)}분 후에 다시 시도해주세요.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.resetInSeconds),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      },
    );
  }

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: '입력 형식이 올바르지 않습니다.' },
      { status: 400 },
    );
  }

  const result = await adminLogin(parsed.data);
  if (!result.success) {
    return NextResponse.json(result, { status: 401 });
  }

  return NextResponse.json(result);
}
