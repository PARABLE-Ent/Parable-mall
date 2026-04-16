import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth/admin';
import { redis } from '@/lib/cache/redis';
import { prisma } from '@/lib/db';

const DASHBOARD_CACHE_KEY = 'admin:dashboard';
const DASHBOARD_CACHE_TTL = 5 * 60; // 5분

export async function GET() {
  await requireAdmin();

  // Redis 캐시 확인
  const cached = await redis.get<string>(DASHBOARD_CACHE_KEY);
  if (cached) {
    try {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return NextResponse.json(parsed);
    } catch {
      // 캐시 파싱 실패 시 무시
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    todayOrders,
    todayRevenue,
    monthlyRevenue,
    totalUsers,
    totalProducts,
    pendingOrders,
    lowStockCount,
  ] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: today },
        status: { in: ['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CONFIRMED'] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CONFIRMED'] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.inventory.count({ where: { quantity: { lte: 5 } } }),
  ]);

  // 최근 주문
  const recentOrders = await prisma.order.findMany({
    include: {
      user: { select: { name: true } },
      items: { select: { productName: true, quantity: true }, take: 2 },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const responseData = {
    summary: {
      todayOrders,
      todayRevenue: todayRevenue._sum.totalAmount ?? 0,
      monthlyRevenue: monthlyRevenue._sum.totalAmount ?? 0,
      totalUsers,
      totalProducts,
      pendingOrders,
      lowStockCount,
    },
    recentOrders,
  };

  // Redis 캐시 저장 (5분)
  await redis.set(DASHBOARD_CACHE_KEY, JSON.stringify(responseData), {
    ex: DASHBOARD_CACHE_TTL,
  });

  return NextResponse.json(responseData);
}
