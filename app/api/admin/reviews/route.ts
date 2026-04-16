import type { NextRequest } from 'next/server';

import { requireAdmin } from '@/lib/auth/admin';
import { prisma } from '@/lib/db';
import {
  apiPaginated,
  getPaginationParams,
  buildPagination,
} from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  await requireAdmin();

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
