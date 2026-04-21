import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/auth/admin-api';
import { logAudit } from '@/lib/audit';
import { updateProductStatus } from '@/server/catalog/product';

const patchSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const product = await updateProductStatus(id, parsed.data.status);
    await logAudit({
      adminUserId: ctx.session.adminUser.id,
      action: 'UPDATE',
      entity: 'Product',
      entityId: id,
      changes: { status: [null, parsed.data.status] },
      ipAddress: ctx.ip,
    });
    return NextResponse.json(product);
  } catch (e) {
    const message = e instanceof Error ? e.message : '상품 상태 변경에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
