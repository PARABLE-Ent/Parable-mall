import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';

import { requireAdminApi } from '@/lib/auth/admin-api';
import { prisma } from '@/lib/db';
import { apiPaginated, getPaginationParams, buildPagination } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get('search') ?? undefined;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        gradeLevel: true,
        totalSpent: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return apiPaginated(users, buildPagination(page, limit, total));
}
