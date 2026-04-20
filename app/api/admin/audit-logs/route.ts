import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAdminApi } from '@/lib/auth/admin-api';
import { getAuditLogs } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const ctx = await requireAdminApi(request, { roles: ['OWNER'] });
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get('page')) || 1;
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const entity = searchParams.get('entity') ?? undefined;
  const adminUserId = searchParams.get('adminUserId') ?? undefined;

  const result = await getAuditLogs({ page, limit, entity, adminUserId });
  return NextResponse.json(result);
}
