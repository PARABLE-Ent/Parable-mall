import { NextResponse } from 'next/server';
import { z } from 'zod';

import { adminLogin } from '@/lib/auth/admin';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
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
