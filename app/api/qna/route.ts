import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { createQnA, createQnASchema, getProductQnAs } from '@/server/review';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const productId = searchParams.get('productId');
  const page = Number(searchParams.get('page')) || 1;

  if (!productId) {
    return NextResponse.json({ error: 'productId가 필요합니다.' }, { status: 400 });
  }

  const result = await getProductQnAs(productId, page);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createQnASchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const qna = await createQnA(session.user.id, parsed.data);
    return NextResponse.json(qna, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Q&A 작성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
