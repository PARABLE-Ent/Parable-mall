import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth/admin';
import { prisma } from '@/lib/db';

const orderStatusEnum = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'PREPARING',
  'SHIPPING',
  'DELIVERED',
  'CONFIRMED',
  'CANCEL_REQUESTED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'EXCHANGE_REQUESTED',
  'EXCHANGED',
]);

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: orderStatusEnum.optional(),
  search: z.string().max(100).optional(),
});

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = request.nextUrl;
  const parsed = querySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { page, limit, status, search } = parsed.data;

  const where: Prisma.OrderWhereInput = {
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' as const } },
        { recipientName: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { productName: true, quantity: true } },
        payment: { select: { method: true, status: true } },
        shipments: { select: { carrier: true, trackingNo: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
