import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAdmin } from '@/lib/auth/admin';
import { createProduct, listProducts } from '@/server/catalog/product';
import { createProductSchema, productListQuerySchema } from '@/server/catalog/product';

export async function GET(request: NextRequest) {
  await requireAdmin();
  const { searchParams } = request.nextUrl;

  const query = productListQuerySchema.safeParse({
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 20,
    categoryId: searchParams.get('categoryId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    sort: searchParams.get('sort') ?? 'newest',
  });

  if (!query.success) {
    return NextResponse.json({ error: query.error.flatten() }, { status: 400 });
  }

  const result = await listProducts(query.data);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const product = await createProduct(parsed.data);
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '상품 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
