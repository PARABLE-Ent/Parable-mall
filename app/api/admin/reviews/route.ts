import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAdminApi } from '@/lib/auth/admin-api';
import { prisma } from '@/lib/db';
import { apiPaginated, getPaginationParams, buildPagination } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = getPaginationParams(searchParams);

  const where = { deletedAt: null };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return apiPaginated(reviews, buildPagination(page, limit, total));
}
