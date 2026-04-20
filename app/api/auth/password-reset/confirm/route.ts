import { NextResponse } from 'next/server';

import { confirmPasswordReset, confirmResetSchema } from '@/server/auth/password-reset';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = confirmResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '입력이 올바르지 않습니다.' }, { status: 400 });
  }
  try {
    await confirmPasswordReset(parsed.data);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '요청 처리에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
