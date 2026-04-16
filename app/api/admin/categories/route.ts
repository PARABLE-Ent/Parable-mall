import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth/admin';
import { createCategory, listCategories } from '@/server/catalog/category';
import { createCategorySchema } from '@/server/catalog/category';

export async function GET() {
  await requireAdmin();
  const categories = await listCategories();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const category = await createCategory(parsed.data);
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '카테고리 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
