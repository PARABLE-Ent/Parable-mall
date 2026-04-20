'use client';

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, ShoppingCart, Users, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardSummary {
  todayOrders: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  totalProducts: number;
  pendingOrders: number;
  lowStockCount: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  user: { name: string | null };
  items: Array<{ productName: string; quantity: number }>;
}

interface DashboardData {
  summary: DashboardSummary;
  recentOrders: RecentOrder[];
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: '결제 대기',
  PAID: '결제 완료',
  PREPARING: '상품 준비',
  SHIPPING: '배송 중',
  DELIVERED: '배송 완료',
  CONFIRMED: '구매 확정',
  CANCEL_REQUESTED: '취소 요청',
  CANCELLED: '취소 완료',
  RETURN_REQUESTED: '반품 요청',
  RETURNED: '반품 완료',
  EXCHANGE_REQUESTED: '교환 요청',
  EXCHANGED: '교환 완료',
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PREPARING: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  SHIPPING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCEL_REQUESTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  RETURN_REQUESTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  RETURNED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

function formatKRW(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}만원`;
  }
  return `${amount.toLocaleString('ko-KR')}원`;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) throw new Error('대시보드 데이터를 불러올 수 없습니다.');
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                <div className="bg-muted mt-2 h-8 w-32 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertTriangle className="text-destructive h-10 w-10" />
            <p className="text-destructive">{error}</p>
            <button
              onClick={() => void fetchDashboard()}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
            >
              다시 시도
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { summary, recentOrders } = data;

  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-muted-foreground mt-1 text-sm">Parable Mall 운영 현황</p>
        </div>
        <button
          onClick={() => void fetchDashboard()}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
          aria-label="새로고침"
        >
          <RefreshCw className="h-4 w-4" />
          새로고침
        </button>
      </div>

      {/* KPI 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">오늘 매출</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKRW(summary.todayRevenue)}</div>
            <p className="text-muted-foreground text-xs">
              월간: {formatKRW(summary.monthlyRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">오늘 주문</CardTitle>
            <ShoppingCart className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.todayOrders}건</div>
            <p className="text-muted-foreground text-xs">활성 상품: {summary.totalProducts}개</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 회원</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalUsers.toLocaleString()}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">대기 주문</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pendingOrders}건</div>
            {summary.lowStockCount > 0 && (
              <p className="text-destructive flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                재고 부족 {summary.lowStockCount}건
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 최근 주문 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 주문</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">주문번호</th>
                  <th className="px-4 py-3 font-medium">고객명</th>
                  <th className="px-4 py-3 font-medium">상품</th>
                  <th className="px-4 py-3 text-right font-medium">금액</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">날짜</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                      최근 주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/50 border-b">
                      <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                      <td className="px-4 py-3">{order.user.name ?? '(이름 없음)'}</td>
                      <td className="max-w-[200px] truncate px-4 py-3">
                        {order.items
                          .map((item) => `${item.productName}(${item.quantity})`)
                          .join(', ')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {order.totalAmount.toLocaleString('ko-KR')}원
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-800'}`}
                        >
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
