import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth/admin';
import { prisma } from '@/lib/db';

export async function GET() {
  await requireAdmin();

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

  return NextResponse.json({
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
  });
}
