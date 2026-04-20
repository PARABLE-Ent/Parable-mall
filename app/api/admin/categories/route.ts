import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/admin-api';
import { logAudit } from '@/lib/audit';
import { createCategory, listCategories } from '@/server/catalog/category';
import { createCategorySchema } from '@/server/catalog/category';

export async function GET(request: Request) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const categories = await listCategories();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const category = await createCategory(parsed.data);
    await logAudit({
      adminUserId: ctx.session.adminUser.id,
      action: 'CREATE',
      entity: 'Category',
      entityId: category.id,
      changes: { name: [null, category.name] },
      ipAddress: ctx.ip,
    });
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '카테고리 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
